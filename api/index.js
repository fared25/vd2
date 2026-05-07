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
                return feed.items.map(item => {
                    // محاولة استخراج أول صورة من محتوى الخبر إذا لم تكن موجودة في الوسوم الرسمية
                    let imgRegex = /<img[^>]+src="([^">]+)"/;
                    let match = imgRegex.exec(item.content || item['content:encoded'] || "");
                    let imageUrl = item.enclosure?.url || (match ? match[1] : 'https://via.placeholder.com/400x200?text=No+Image');

                    return {
                        title: item.title,
                        link: item.link,
                        pubDate: item.pubDate,
                        sourceName: source.name,
                        description: item.contentSnippet ? item.contentSnippet.substring(0, 150) + "..." : "لا يوجد وصف مختصر...",
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
                body { font-family: 'Segoe UI', Tahoma, sans-serif; background-color: #0f0f0f; color: #fff; margin: 0; padding: 10px; }
                .container { max-width: 600px; margin: auto; }
                header { text-align: center; padding: 20px 0; background: linear-gradient(45deg, #007bff, #00c6ff); border-radius: 15px; margin-bottom: 20px; box-shadow: 0 4px 15px rgba(0,123,255,0.3); }
                h1 { margin: 0; font-size: 24px; text-shadow: 2px 2px 4px rgba(0,0,0,0.5); }
                .card { background: #1a1a1a; border-radius: 12px; overflow: hidden; margin-bottom: 20px; box-shadow: 0 5px 15px rgba(0,0,0,0.5); border: 1px solid #333; }
                .card img { width: 100%; height: 220px; object-fit: cover; }
                .content { padding: 15px; }
                .source-tag { background: #007bff; color: white; padding: 3px 10px; border-radius: 5px; font-size: 12px; font-weight: bold; }
                .card h3 { margin: 10px 0; font-size: 18px; line-height: 1.4; color: #fff; }
                .card p { font-size: 14px; color: #bbb; line-height: 1.6; margin-bottom: 15px; }
                .card-footer { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #333; padding-top: 10px; }
                .btn { background: #333; color: #00c6ff; padding: 8px 15px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 13px; transition: 0.3s; }
                .btn:hover { background: #007bff; color: #fff; }
                .date { font-size: 11px; color: #666; }
            </style>
        </head>
        <body>
            <div class="container">
                <header><h1>🎮 أخبار ألعاب الفيديو 2</h1></header>
                ${combinedNews.map(item => `
                    <div class="card">
                        <img src="${item.image}" alt="خبر">
                        <div class="content">
                            <span class="source-tag">${item.sourceName}</span>
                            <h3>${item.title}</h3>
                            <p>${item.description}</p>
                            <div class="card-footer">
                                <span class="date">${new Date(item.pubDate).toLocaleDateString('ar-EG', { day:'numeric', month:'long' })}</span>
                                <a href="${item.link}" target="_blank" class="btn">عرض الخبر</a>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </body>
        </html>`;

        res.send(htmlContent);

    } catch (error) {
        res.status(500).send("خطأ في جلب البيانات");
    }
});

module.exports = app;
