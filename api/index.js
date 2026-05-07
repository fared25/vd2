const express = require('express');
const RSSParser = require('rss-parser');
const cors = require('cors');

const app = express();
// إضافة إعدادات مخصصة لـ Parser ليدعم وسوم الصور المختلفة
const parser = new RSSParser({
    customFields: {
        item: [
            ['media:content', 'mediaContent', {keepArray: false}],
            ['content:encoded', 'contentEncoded']
        ]
    }
});

app.use(cors());

app.get('/', async (req, res) => {
    // كود تسريع التحميل من Vercel (يخزن النسخة لمدة دقيقة ويحدثها في الخلفية)
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');

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
                return feed.items.slice(0, 10).map(item => {
                    // محرك ذكي لاستخراج الصورة
                    let imageUrl = 'https://via.placeholder.com/400x200?text=No+Image';
                    
                    if (item.mediaContent && item.mediaContent.$ && item.mediaContent.$.url) {
                        imageUrl = item.mediaContent.$.url;
                    } else if (item.enclosure && item.enclosure.url) {
                        imageUrl = item.enclosure.url;
                    } else {
                        // البحث عن أول صورة داخل المحتوى المشفر (سعودي جيمر يستخدم هذا غالباً)
                        const imgRegex = /<img[^>]+src="([^">]+)"/;
                        const match = imgRegex.exec(item.contentEncoded || item.content || "");
                        if (match) imageUrl = match[1];
                    }

                    return {
                        title: item.title,
                        link: item.link,
                        pubDate: item.pubDate,
                        sourceName: source.name,
                        description: item.contentSnippet ? item.contentSnippet.substring(0, 120) + "..." : "تحديث جديد في عالم الألعاب...",
                        image: imageUrl
                    };
                });
            } catch (err) { return []; }
        });

        const results = await Promise.all(feedPromises);
        let combinedNews = [].concat(...results);
        combinedNews.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

        let htmlContent = `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>أخبار ألعاب الفيديو 2</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, sans-serif; background-color: #050505; color: #fff; margin: 0; padding: 10px; }
                .container { max-width: 500px; margin: auto; }
                header { text-align: center; padding: 15px; background: #1a1a1a; border-radius: 10px; margin-bottom: 20px; border: 1px solid #007bff; }
                .card { background: #111; border-radius: 15px; overflow: hidden; margin-bottom: 25px; border: 1px solid #222; }
                .img-container { width: 100%; height: 200px; background: #222; position: relative; }
                .card img { width: 100%; height: 100%; object-fit: cover; }
                .source-tag { position: absolute; top: 10px; right: 10px; background: rgba(0, 123, 255, 0.9); padding: 4px 10px; border-radius: 5px; font-size: 11px; font-weight: bold; }
                .content { padding: 15px; }
                .card h3 { margin: 0; font-size: 17px; color: #fff; line-height: 1.5; }
                .card p { font-size: 13px; color: #888; margin-top: 10px; }
                .card-footer { margin-top: 15px; display: flex; justify-content: space-between; align-items: center; }
                .btn { color: #00c6ff; text-decoration: none; font-size: 14px; font-weight: bold; }
                .date { font-size: 10px; color: #555; }
            </style>
        </head>
        <body>
            <div class="container">
                <header><h1>🎮 أخبار الألعاب 2</h1></header>
                ${combinedNews.map(item => `
                    <div class="card">
                        <div class="img-container">
                            <span class="source-tag">${item.sourceName}</span>
                            <img src="${item.image}" loading="lazy" onerror="this.src='https://via.placeholder.com/400x200?text=News+Image'">
                        </div>
                        <div class="content">
                            <h3>${item.title}</h3>
                            <p>${item.description}</p>
                            <div class="card-footer">
                                <span class="date">${new Date(item.pubDate).toLocaleDateString('ar-EG')}</span>
                                <a href="${item.link}" target="_blank" class="btn">إقرأ المزيد ←</a>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </body>
        </html>`;

        res.send(htmlContent);

    } catch (error) {
        res.status(500).send("عذراً، حدث خطأ في النظام");
    }
});

module.exports = app;
