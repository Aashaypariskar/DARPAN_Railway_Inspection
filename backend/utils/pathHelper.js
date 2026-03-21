const fs = require('fs');
const path = require('path');

/**
 * Normalizes and verifies image paths for dashboard and reporting.
 * Salvages file:// URIs using fuzzy filename matching on server disk.
 */
function normalizeImagePath(p) {
    if (!p) return null;

    // remove Android local URIs
    if (typeof p === 'string' && p.startsWith("file://")) return null;

    let filename = p;
    if (typeof p === 'string' && p.includes("uploads/")) {
        const parts = p.split("uploads/");
        filename = parts.pop().replace(/^\/+/, "");
    } else if (typeof p === 'string' && p.includes("\\")) {
        filename = p.split("\\").pop();
    } else if (typeof p === 'string' && p.includes("/")) {
        filename = p.split("/").pop();
    }

    const uploadsDir = path.join(process.cwd(), "uploads");
    const filePath = path.join(uploadsDir, filename);

    if (fs.existsSync(filePath)) {
        return `uploads/${filename}`;
    }

    // Special case: check resolutions folder
    const resPath = path.join(uploadsDir, "resolutions", filename);
    if (fs.existsSync(resPath)) {
        return `uploads/resolutions/${filename}`;
    }

    return null;
}

/**
 * Temporal Salvage: Search for time-proximal images in uploads directory.
 */
function findImageByTimestamp(createdAt) {
    try {
        const uploadsDir = path.join(process.cwd(), "uploads");
        if (!fs.existsSync(uploadsDir)) return null;

        const files = fs.readdirSync(uploadsDir);
        const defectTime = new Date(createdAt).getTime();

        let bestMatch = null;
        let smallestDiff = Infinity;

        for (const file of files) {
            if (file === 'resolutions' || !file.includes('photo-')) continue;
            const filePath = path.join(uploadsDir, file);

            let fileTime;
            // Try to extract timestamp from filename (photo-1234567890123.jpeg)
            const match = file.match(/photo-(\d{10,13})/);
            if (match) {
                fileTime = parseInt(match[1]);
                // Handle 10-digit unix timestamps (seconds) vs 13-digit (ms)
                if (fileTime < 10000000000) fileTime *= 1000;
            } else {
                const stat = fs.statSync(filePath);
                fileTime = stat.mtimeMs;
            }

            const diff = Math.abs(fileTime - defectTime);

            // ±48 hours (172,800,000 ms) for extremely delayed syncs
            if (diff < smallestDiff && diff <= 172800000) {
                smallestDiff = diff;
                bestMatch = file;
            }
        }

        return bestMatch ? `uploads/${bestMatch}` : null;

    } catch (err) {
        console.warn("[TEMPORAL SALVAGE ERROR]", err.message);
        return null;
    }
}

/**
 * Picks the best available verified image from multiple potential columns
 */
function getBestImageUrl(...paths) {
    for (const p of paths) {
        const normalized = normalizeImagePath(p);
        if (normalized) return normalized;
    }
    return null;
}

module.exports = {
    normalizeImagePath,
    findImageByTimestamp,
    getBestImageUrl
};
