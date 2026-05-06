const express = require('express');
const RSSParser = require('rss-parser');
const cors = require('cors');

const app = express();
const parser = new RSSParser();

app.use(cors());

app.get('/', async (req, res) => {
    const SOURCES = [
        { name: "سعودي جيمر", url: "https://www.saudigamer.com/feed/" },
        { name: "ترو جيمنج", url: "https://www.truegaming.net/home/feed/" },
        { name: "IGN الشرق الأوسط", url: "https://me.ign.com/ar/feed.xml" },
        { name: "زيباد", url: "https://z-pad.net/feed/" },
        { name: "ديجيتال آي", url: "https://d-eye.net/feed/" }
    ];

    try {
        let feedPromises = SOURCES.map(async (source) => {
            try {
                const feed = await parser.parseURL(source.url);
                return feed.items.map(item => ({
                    title: item.title,
                    link: item.link,
                    pubDate: item.pubDate,
                    sourceName: source.name
                }));
            } catch (err) { return []; }
        });

        const results = await Promise.all(feedPromises);
        let combinedNews = [].concat(...results);
        combinedNews.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

        // --- هنا الإضافة لتحويل الرابط إلى HTML ---
        let htmlContent = `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>أخبار ألعاب الفيديو 2</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #121212; color: #e0e0e0; margin: 0; padding: 20px; }
                .container { max-width: 800px; margin: auto; }
                h1 { text-align: center; color: #007bff; border-bottom: 2px solid #333; padding-bottom: 10px; }
                .card { background: #1e1e1e; border-radius: 8px; padding: 15px; margin-bottom: 15px; border-right: 5px solid #007bff; transition: 0.3s; }
                .card:hover { background: #252525; transform: scale(1.01); }
                .card h3 { margin: 0 0 10px 0; font-size: 18px; color: #fff; }
                .source { display: inline-block; background: #333; padding: 2px 8px; border-radius: 4px; font-size: 12px; color: #aaa; }
                .date { font-size: 11px; color: #666; margin-right: 10px; }
                .btn { display: inline-block; margin-top: 10px; color: #007bff; text-decoration: none; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>أخبار ألعاب الفيديو 2</h1>
                ${combinedNews.map(item => `
                    <div class="card">
                        <h3>${item.title}</h3>
                        <span class="source">${item.sourceName}</span>
                        <span class="date">${new Date(item.pubDate).toLocaleDateString('ar-SA')}</span>
                        <br>
                        <a href="${item.link}" target="_blank" class="btn">إقرأ الخبر كاملاً ←</a>
                    </div>
                `).join('')}
            </div>
        </body>
        </html>`;

        res.send(htmlContent); // إرسال الصفحة كـ HTML للمتصفح

    } catch (error) {
        res.status(500).send("خطأ في تحميل الأخبار");
    }
});

module.exports = app;
