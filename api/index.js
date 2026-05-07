const express = require('express');
const RSSParser = require('rss-parser');
const cors = require('cors');

const app = express();
const parser = new RSSParser({
    customFields: {
        item: [
            ['media:content', 'mediaContent', {keepArray: false}],
            ['content:encoded', 'contentEncoded'],
            ['image', 'image']
        ]
    }
});

app.use(cors());

app.get('/', async (req, res) => {
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');

    const SOURCES = [
        { name: "عرب جيمرز", url: "https://arabgamerz.com/feed/" },
        { name: "إيلدر بلايرز", url: "https://elderplayers.com/feed/" },
        { name: "ترو جيمنج", url: "https://www.truegaming.net/home/feed/" },
        { name: "سعودي جيمر", url: "https://www.saudigamer.com/feed/" },
        { name: "VGA4A", url: "https://vga4a.com/feed" }
    ];

    try {
        let feedPromises = SOURCES.map(async (source) => {
            try {
                const feed = await parser.parseURL(source.url);
                return feed.items.slice(0, 10).map(item => {
                    let imageUrl = 'https://via.placeholder.com/400x200?text=No+Image';
                    
                    // 1. فحص الوسوم الرسمية (Enclosure)
                    if (item.enclosure && item.enclosure.url) {
                        imageUrl = item.enclosure.url;
                    } 
                    // 2. فحص وسم Media Content (يستخدمه VGA4A أحياناً)
                    else if (item.mediaContent && item.mediaContent.$ && item.mediaContent.$.url) {
                        imageUrl = item.mediaContent.$.url;
                    } 
                    // 3. البحث المعمق داخل المحتوى (لحل مشكلة VGA4A وعرب جيمرز)
                    else {
                        const content = item.contentEncoded || item.content || "";
                        const imgRegex = /<img[^>]+src="([^">?]+)/; // تعديل لجلب الرابط النظيف بدون متغيرات
                        const match = imgRegex.exec(content);
                        if (match) imageUrl = match[1];
                    }

                    // تنظيف الرابط إذا كان يحتوي على قياسات تصغير (خاص بـ VGA4A)
                    if (imageUrl.includes('i0.wp.com') || imageUrl.includes('i1.wp.com')) {
                        imageUrl = imageUrl.split('?')[0]; // إزالة متغيرات الحجم لتحسين الجودة والظهور
                    }

                    return {
                        title: item.title,
                        link: item.link,
                        pubDate: item.pubDate,
                        sourceName: source.name,
                        description: item.contentSnippet ? item.contentSnippet.substring(0, 120) + "..." : "تحديث جديد من عالم الألعاب...",
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
                body { font-family: 'Segoe UI', Tahoma, sans-serif; background-color: #080808; color: #fff; margin: 0; padding: 10px; }
                .container { max-width: 500px; margin: auto; }
                header { text-align: center; padding: 20px; background: #111; border-radius: 12px; margin-bottom: 25px; border-bottom: 3px solid #007bff; }
                .card { background: #161616; border-radius: 15px; overflow: hidden; margin-bottom: 25px; border: 1px solid #222; }
                .img-container { width: 100%; height: 210px; background: #222; position: relative; }
                .card img { width: 100%; height: 100%; object-fit: cover; }
                .source-tag { position: absolute; top: 12px; right: 12px; background: #007bff; padding: 4px 12px; border-radius: 6px; font-size: 11px; font-weight: bold; }
                .content { padding: 18px; }
                .card h3 { margin: 0; font-size: 18px; color: #fff; line-height: 1.5; }
                .card p { font-size: 13px; color: #999; margin-top: 10px; line-height: 1.6; }
                .card-footer { margin-top: 20px; display: flex; justify-content: space-between; align-items: center; }
                .btn { background: #333; color: #00c6ff; text-decoration: none; padding: 8px 16px; border-radius: 8px; font-size: 13px; }
                .date { font-size: 11px; color: #555; }
            </style>
        </head>
        <body>
            <div class="container">
                <header><h1>🎮 أخبار ألعاب الفيديو 2</h1></header>
                ${combinedNews.map(item => `
                    <div class="card">
                        <div class="img-container">
                            <span class="source-tag">${item.sourceName}</span>
                            <img src="${item.image}" loading="lazy" referrerpolicy="no-referrer" onerror="this.src='https://via.placeholder.com/400x200?text=News+Image'">
                        </div>
                        <div class="content">
                            <h3>${item.title}</h3>
                            <p>${item.description}</p>
                            <div class="card-footer">
                                <span class="date">${new Date(item.pubDate).toLocaleDateString('ar-EG')}</span>
                                <a href="${item.link}" target="_blank" class="btn">التفاصيل ←</a>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </body>
        </html>`;

        res.send(htmlContent);

    } catch (error) {
        res.status(500).send("حدث خطأ في النظام");
    }
});

module.exports = app;
