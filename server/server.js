const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const xlsx = require('xlsx');
const multer = require('multer');
const db = require('./db');
const { router: authRouter, requireAuth, requireAdmin } = require('./auth');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

// Mount auth routes
app.use('/api/auth', authRouter);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB max
const jobs = new Map();

// Auto-cleanup completed jobs after 10 minutes to prevent memory leaks
setInterval(() => {
    const now = Date.now();
    for (const [jobId, job] of jobs.entries()) {
        if ((job.status === 'completed' || job.status === 'error') && now - parseInt(jobId) > 10 * 60 * 1000) {
            jobs.delete(jobId);
        }
    }
}, 60 * 1000);

// In-memory cache (5 minutes)
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000;

// Known country demonyms → country name mappings for cleaning
const COUNTRY_FIXES = {
    'indian': 'India', 'chinese': 'China', 'american': 'United States',
    'russian': 'Russia', 'japanese': 'Japan', 'korean': 'South Korea',
    'brazilian': 'Brazil', 'canadian': 'Canada', 'german': 'Germany',
    'french': 'France', 'british': 'United Kingdom', 'australian': 'Australia',
    'bangladeshi': 'Bangladesh', 'pakistani': 'Pakistan', 'sri lankan': 'Sri Lanka',
    'nepali': 'Nepal', 'indonesian': 'Indonesia', 'vietnamese': 'Vietnam',
};

function cleanProfileData(raw) {
    let stars = 'N/A';
    let rating = 'N/A';
    const rawStars = (raw.stars || '').toString();
    if (rawStars.includes('★')) {
        const parts = rawStars.split('★');
        const parsed = parseInt(parts[0].trim());
        if (!isNaN(parsed)) stars = parsed;
    } else if (rawStars !== 'Unrated' && rawStars !== '') {
        const parsed = parseInt(rawStars);
        if (!isNaN(parsed)) stars = parsed;
    }

    const rawRating = (raw.rating || '').toString().trim();
    const ratingNum = parseInt(rawRating);
    if (!isNaN(ratingNum)) {
        rating = ratingNum;
    } else if (rawStars.includes('★')) {
        const afterStar = rawStars.split('★')[1] || '';
        const rNum = parseInt(afterStar.trim().split(/\s/)[0]);
        if (!isNaN(rNum)) rating = rNum;
    }

    const toNum = (v) => {
        if (v === 'NA' || v === 'N/A' || !v) return 'N/A';
        const n = parseInt(v.toString().replace(/,/g, ''));
        return isNaN(n) ? 'N/A' : n;
    };

    let country = (raw.country || 'N/A').toString().trim();
    if (country && country !== 'NA' && country !== 'N/A') {
        const lower = country.toLowerCase();
        for (const [demonym, name] of Object.entries(COUNTRY_FIXES)) {
            if (lower.startsWith(demonym) && lower !== demonym) {
                country = country.substring(demonym.length).trim() || name;
                break;
            }
        }
    }
    if (!country || country === 'NA') country = 'N/A';

    return {
        username: raw.username || 'N/A',
        rating,
        stars,
        division: raw.division || 'N/A',
        globalRank: toNum(raw.globalRank),
        countryRank: toNum(raw.countryRank),
        highestRating: toNum(raw.highestRating),
        country,
        institution: raw.institution && raw.institution !== 'NA' ? raw.institution : 'N/A'
    };
}

async function scrapeCodeChefProfile(username) {
    const maxRetries = 2;
    let attempt = 0;
    
    while(attempt <= maxRetries) {
        try {
            const url = `https://www.codechef.com/users/${username}`;
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                },
                timeout: 15000 
            });

            const html = response.data;
            const $ = cheerio.load(html);

            const rating = $('.rating-number').text().trim();
            if (!rating) {
                throw Object.assign(new Error('User not found or profile is hidden'), { status: 404 });
            }

            const stars = $('.rating').text().trim() || 'Unrated';
            let globalRank = 'NA';
            let countryRank = 'NA';
            
            $('.rating-ranks ul li').each((i, el) => {
                const text = $(el).text();
                if (text.includes('Global Rank')) {
                    globalRank = $(el).find('a').text().trim() || $(el).find('strong').text().trim() || text.replace('Global Rank', '').trim();
                } else if (text.includes('Country Rank')) {
                    countryRank = $(el).find('a').text().trim() || $(el).find('strong').text().trim() || text.replace('Country Rank', '').trim();
                }
            });

            let highestRating = 'NA';
            const highestRatingText = $('.rating-header').text();
            const highestMatch = highestRatingText.match(/Highest Rating\s*(\d+)/i);
            if (highestMatch && highestMatch[1]) {
                highestRating = highestMatch[1];
            } else {
                let textRaw = $('.rating-header small').text();
                let nums = textRaw.match(/\d+/g);
                if (nums && nums.length > 0) highestRating = nums[0];
            }
            
            let country = 'NA';
            let institution = 'NA';

            $('.user-details li').each((i, el) => {
                const label = $(el).find('label').text().trim();
                const value = $(el).find('span').text().trim();
                if (label.includes('Country:')) {
                    country = value;
                } else if (label.includes('Institution:')) {
                    institution = value;
                }
            });
            
            let division = 'Div ?'; 
            const divMatch = highestRatingText.match(/(Div\s*\d)/i);
            if (divMatch && divMatch[1]) {
                division = divMatch[1];
            } else {
                const innerDiv = $('.rating-header .rating-star').next('div').text() || '';
                const m2 = innerDiv.match(/(Div\s*\d)/i);
                if (m2 && m2[1]) division = m2[1];
            }

            return cleanProfileData({
                username,
                rating,
                stars,
                division,
                globalRank,
                countryRank,
                highestRating,
                country,
                institution
            });
        } catch (error) {
            console.error(`Attempt ${attempt + 1} failed:`, error.message);
            if (error.response && error.response.status === 404) {
                throw Object.assign(new Error('User not found'), { status: 404 });
            }
            if (error.status === 404) {
                throw error;
            }
            if (attempt === maxRetries) {
                if (error.code === 'ECONNABORTED') {
                    throw Object.assign(new Error('Request to CodeChef timed out after retries'), { status: 504 });
                }
                throw Object.assign(new Error('Failed to fetch profile data. Service might be temporarily blocked.'), { status: 500 });
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempt++;
        }
    }
}

// ── Public: single profile scrape (kept open for preview) ──
app.get('/api/codechef/:username', async (req, res) => {
    const { username } = req.params;
    if (!username) return res.status(400).json({ error: 'Username is required' });

    if (cache.has(username)) {
        const cachedData = cache.get(username);
        if (Date.now() - cachedData.timestamp < CACHE_DURATION) {
            return res.json(cachedData.data);
        } else {
            cache.delete(username);
        }
    }

    try {
        const profileData = await scrapeCodeChefProfile(username);
        cache.set(username, { data: profileData, timestamp: Date.now() });
        res.json(profileData);
    } catch (error) {
        const status = error.status || 500;
        res.status(status).json({ error: error.message });
    }
});

// ── Admin only: single profile Excel download ──
app.get('/api/codechef/:username/excel', requireAuth, requireAdmin, async (req, res) => {
    const { username } = req.params;
    if (!username) return res.status(400).json({ error: 'Username is required' });

    try {
        let profileData;
        if (cache.has(username) && Date.now() - cache.get(username).timestamp < CACHE_DURATION) {
            profileData = cache.get(username).data;
        } else {
            profileData = await scrapeCodeChefProfile(username);
            cache.set(username, { data: profileData, timestamp: Date.now() });
        }

        const wb = xlsx.utils.book_new();
        const formattedData = [{
            "Username": profileData.username,
            "Rating": profileData.rating,
            "Stars": profileData.stars,
            "Division": profileData.division,
            "Global Rank": profileData.globalRank,
            "Country Rank": profileData.countryRank,
            "Highest Rating": profileData.highestRating,
            "Country": profileData.country,
            "Institution": profileData.institution
        }];
        const ws = xlsx.utils.json_to_sheet(formattedData);
        xlsx.utils.book_append_sheet(wb, ws, "Profile Data");

        const excelBuffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
        
        res.setHeader('Content-Disposition', `attachment; filename="${username}_codechef_profile.xlsx"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(excelBuffer);
    } catch (error) {
        const status = error.status || 500;
        res.status(status).json({ error: error.message });
    }
});

// ── Admin only: bulk Excel preview ──
app.post('/api/codechef/bulk-excel/preview', requireAuth, requireAdmin, upload.single('file'), async (req, res) => {
    console.log('[Bulk] Received preview file:', req.file ? req.file.originalname : null);
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    try {
        const wb = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheets = wb.SheetNames.map(name => {
            const ws = wb.Sheets[name];
            const rows = xlsx.utils.sheet_to_json(ws, { defval: '' });
            const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
            return { name, columns, rowCount: rows.length };
        });

        if (sheets.length === 0) return res.status(400).json({ error: 'Excel file has no sheets' });
        res.json({ sheets });
    } catch (error) {
        res.status(500).json({ error: 'Failed to read Excel file' });
    }
});

// ── Admin only: bulk Excel process ──
app.post('/api/codechef/bulk-excel', requireAuth, requireAdmin, upload.single('file'), async (req, res) => {
    console.log('[Bulk] Received processing file:', req.file ? req.file.originalname : null);
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    try {
        const wb = xlsx.read(req.file.buffer, { type: 'buffer' });
        const selectedSheet = req.body?.sheetName || null;
        const selectedColumn = req.body?.usernameColumn || null;

        const sheetNames = selectedSheet ? [selectedSheet] : wb.SheetNames;
        const sheetDataList = [];
        let totalUsernames = 0;

        for (const sheetName of sheetNames) {
            const ws = wb.Sheets[sheetName];
            if (!ws) continue;
            const rows = xlsx.utils.sheet_to_json(ws, { defval: '' });
            if (rows.length === 0) continue;

            const keys = Object.keys(rows[0]);
            const usernameKey = selectedColumn
                ? keys.find(k => k === selectedColumn)
                : keys.find(k => k.toLowerCase() === 'username');

            if (!usernameKey) continue;

            const validCount = rows.filter(r => r[usernameKey] && r[usernameKey].toString().trim() !== '').length;
            totalUsernames += validCount;
            sheetDataList.push({ sheetName, rows, usernameKey });
        }

        if (sheetDataList.length === 0) {
            return res.status(400).json({ error: 'No sheet with a valid username column found' });
        }
        if (totalUsernames === 0) {
            return res.status(400).json({ error: 'No valid usernames found' });
        }

        const jobId = Date.now().toString();
        jobs.set(jobId, {
            status: 'processing',
            total: totalUsernames,
            processed: 0,
            sheetDataList,
            results: [],
            excelBuffer: null
        });

        processBulkExcel(jobId);

        res.json({ jobId, total: totalUsernames });
    } catch (error) {
        res.status(500).json({ error: 'Failed to process Excel file' });
    }
});

async function processBulkExcel(jobId) {
    const job = jobs.get(jobId);
    if (!job) return;

    const completedSheets = [];

    for (const sheetData of job.sheetDataList) {
        const updatedRows = [];

        for (const row of sheetData.rows) {
            const username = row[sheetData.usernameKey]?.toString().trim();
            if (!username) {
                updatedRows.push(row);
                continue;
            }

            console.log('[Bulk] Processing:', username);

            try {
                let profileData;
                if (cache.has(username) && Date.now() - cache.get(username).timestamp < CACHE_DURATION) {
                    profileData = cache.get(username).data;
                } else {
                    profileData = await scrapeCodeChefProfile(username);
                    cache.set(username, { data: profileData, timestamp: Date.now() });
                    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
                }

                console.log('[Bulk] Scraped data for', username, ':', JSON.stringify(profileData));

                updatedRows.push({
                    ...row,
                    username: profileData.username,
                    rating: profileData.rating,
                    stars: profileData.stars,
                    division: profileData.division,
                    globalRank: profileData.globalRank,
                    countryRank: profileData.countryRank,
                    highestRating: profileData.highestRating,
                    country: profileData.country,
                    institution: profileData.institution
                });
            } catch (error) {
                console.error('[Bulk] Failed for', username, ':', error.message);
                updatedRows.push({
                    ...row,
                    username,
                    rating: 'N/A',
                    stars: 'N/A',
                    division: 'N/A',
                    globalRank: 'N/A',
                    countryRank: 'N/A',
                    highestRating: 'N/A',
                    country: 'N/A',
                    institution: 'N/A'
                });
            }

            job.processed++;
        }

        completedSheets.push({ sheetName: sheetData.sheetName, rows: updatedRows });
    }

    const formatRowForExcel = (row) => ({
        "Username": row.username ?? row[Object.keys(row).find(k => k.toLowerCase() === 'username')] ?? '',
        "Rating": row.rating ?? 'N/A',
        "Stars": row.stars ?? 'N/A',
        "Division": row.division ?? 'N/A',
        "Global Rank": row.globalRank ?? 'N/A',
        "Country Rank": row.countryRank ?? 'N/A',
        "Highest Rating": row.highestRating ?? 'N/A',
        "Country": row.country ?? 'N/A',
        "Institution": row.institution ?? 'N/A'
    });

    try {
        const wb = xlsx.utils.book_new();
        for (const sheet of completedSheets) {
            const excelRows = sheet.rows.map(formatRowForExcel);
            const ws = xlsx.utils.json_to_sheet(excelRows);
            xlsx.utils.book_append_sheet(wb, ws, sheet.sheetName);
        }
        const excelBuffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

        job.excelBuffer = excelBuffer;
        job.completedSheets = completedSheets;
        job.status = 'completed';
        console.log('[Bulk] Job', jobId, 'completed successfully');
    } catch (err) {
        console.error('[Bulk] Excel generation error:', err.message);
        job.status = 'error';
    }
}

app.get('/api/codechef/job/:jobId/data', (req, res) => {
    const { jobId } = req.params;
    const job = jobs.get(jobId);

    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (job.status !== 'completed' || !job.completedSheets) {
        return res.status(400).json({ error: 'Job not yet completed' });
    }

    const rows = job.completedSheets.flatMap(s => s.rows);
    res.json({ rows, total: rows.length });
});

app.get('/api/codechef/job/:jobId/progress', (req, res) => {
    const { jobId } = req.params;
    const job = jobs.get(jobId);
    
    if (!job) {
        return res.status(404).json({ error: 'Job not found' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    if (res.flushHeaders) res.flushHeaders();

    const sendProgress = () => {
        res.write(`data: ${JSON.stringify({ status: job.status, processed: job.processed, total: job.total })}\n\n`);
    };

    sendProgress();

    const intervalId = setInterval(() => {
        const currentJob = jobs.get(jobId);
        if (!currentJob) {
            clearInterval(intervalId);
            res.end();
            return;
        }

        res.write(`data: ${JSON.stringify({ status: currentJob.status, processed: currentJob.processed, total: currentJob.total })}\n\n`);

        if (currentJob.status === 'completed' || currentJob.status === 'error') {
            clearInterval(intervalId);
            res.end();
        }
    }, 1000);

    req.on('close', () => clearInterval(intervalId));
});

app.get('/api/codechef/job/:jobId/download', (req, res) => {
    const { jobId } = req.params;
    const job = jobs.get(jobId);

    if (!job || job.status !== 'completed' || !job.excelBuffer) {
        return res.status(400).json({ error: 'Job not completed or found' });
    }

    res.setHeader('Content-Disposition', `attachment; filename="updated_codechef_profiles.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(job.excelBuffer);

    job.excelBuffer = null;
});

// ═══════════════════════════════════════════════════════════
// ── Section Management ──
// ═══════════════════════════════════════════════════════════

app.get('/api/sections', (req, res) => {
    const sections = db.read('sections.json') || {
        studyYears: [], academicYears: [], sectionNumbers: []
    };
    res.json(sections);
});

app.post('/api/sections', requireAuth, requireAdmin, (req, res) => {
    const { sectionNumber, academicYear, studyYear } = req.body;

    const sections = db.read('sections.json') || {
        studyYears: [], academicYears: [], sectionNumbers: []
    };

    let added = null;

    if (studyYear && studyYear.trim()) {
        const trimmed = studyYear.trim();
        if (sections.studyYears.includes(trimmed)) {
            return res.status(409).json({ error: 'Study year already exists' });
        }
        sections.studyYears.push(trimmed);
        added = `Study year "${trimmed}"`;
    } else if (academicYear && academicYear.trim()) {
        const trimmed = academicYear.trim();
        if (sections.academicYears.includes(trimmed)) {
            return res.status(409).json({ error: 'Academic year already exists' });
        }
        sections.academicYears.push(trimmed);
        added = `Academic year "${trimmed}"`;
    } else if (sectionNumber && sectionNumber.trim()) {
        const trimmed = sectionNumber.trim();
        if (sections.sectionNumbers.includes(trimmed)) {
            return res.status(409).json({ error: 'Section already exists' });
        }
        sections.sectionNumbers.push(trimmed);
        added = `Section "${trimmed}"`;
    } else {
        return res.status(400).json({ error: 'A value to add is required' });
    }

    db.write('sections.json', sections);
    res.json({ message: `${added} added successfully`, sections });
});

// ═══════════════════════════════════════════════════════════
// ── Profile Database (Save / Read / Download) ──
// ═══════════════════════════════════════════════════════════

// Admin: Save scraped profiles to database
app.post('/api/profiles/save', requireAuth, requireAdmin, (req, res) => {
    const { profiles, studyYear, academicYear, sectionNumber } = req.body;

    if (!profiles || !Array.isArray(profiles) || profiles.length === 0) {
        return res.status(400).json({ error: 'Profiles array is required' });
    }
    if (!studyYear || !academicYear || !sectionNumber) {
        return res.status(400).json({ error: 'Study year, academic year, and section number are required' });
    }

    const existing = db.read('profiles.json') || [];

    const timestamp = new Date().toISOString();
    const newEntries = profiles.map(p => ({
        ...p,
        studyYear,
        academicYear,
        sectionNumber,
        savedAt: timestamp,
        savedBy: req.user.username
    }));

    // Replace existing profiles for the same section combo, or append
    const key = `${studyYear}|${academicYear}|${sectionNumber}`;
    const filtered = existing.filter(e =>
        `${e.studyYear}|${e.academicYear}|${e.sectionNumber}` !== key
    );

    const updated = [...filtered, ...newEntries];
    db.write('profiles.json', updated);

    res.json({
        message: `Saved ${newEntries.length} profiles for ${sectionNumber} (${studyYear}, ${academicYear})`,
        totalProfiles: updated.length
    });
});

// Anyone authenticated: Get saved profiles (with optional filters)
app.get('/api/profiles', requireAuth, (req, res) => {
    const { studyYear, academicYear, sectionNumber } = req.query;
    let profiles = db.read('profiles.json') || [];

    if (studyYear) profiles = profiles.filter(p => p.studyYear === studyYear);
    if (academicYear) profiles = profiles.filter(p => p.academicYear === academicYear);
    if (sectionNumber) profiles = profiles.filter(p => p.sectionNumber === sectionNumber);

    res.json({ profiles, total: profiles.length });
});

// Anyone authenticated: Download saved profiles as Excel
app.get('/api/profiles/download', requireAuth, (req, res) => {
    const { studyYear, academicYear, sectionNumber } = req.query;
    let profiles = db.read('profiles.json') || [];

    if (studyYear) profiles = profiles.filter(p => p.studyYear === studyYear);
    if (academicYear) profiles = profiles.filter(p => p.academicYear === academicYear);
    if (sectionNumber) profiles = profiles.filter(p => p.sectionNumber === sectionNumber);

    if (profiles.length === 0) {
        return res.status(404).json({ error: 'No profiles found for the given filters' });
    }

    const wb = xlsx.utils.book_new();
    const formattedData = profiles.map(p => ({
        "Username": p.username ?? 'N/A',
        "Rating": p.rating ?? 'N/A',
        "Stars": p.stars ?? 'N/A',
        "Division": p.division ?? 'N/A',
        "Global Rank": p.globalRank ?? 'N/A',
        "Country Rank": p.countryRank ?? 'N/A',
        "Highest Rating": p.highestRating ?? 'N/A',
        "Country": p.country ?? 'N/A',
        "Institution": p.institution ?? 'N/A',
        "Study Year": p.studyYear ?? '',
        "Academic Year": p.academicYear ?? '',
        "Section": p.sectionNumber ?? '',
        "Saved At": p.savedAt ?? ''
    }));

    const ws = xlsx.utils.json_to_sheet(formattedData);
    xlsx.utils.book_append_sheet(wb, ws, "Profiles");
    const excelBuffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const filename = `codechef_profiles_${(sectionNumber || 'all').replace(/\s/g, '_')}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(excelBuffer);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
