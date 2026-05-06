const express = require('express');
const RSSParser = require('rss-parser');
const cors = require('cors');

const app = express();
const parser = new RSSParser();

app.use(cors()); // للسماح لتطبيق الأندرويد بالوصول للبيانات

const SOURCES = [
    { name: "سعودي جيمر", url: "https://www.saudigamer.com/feed/" },
    { name: "ترو جيمنج", url: "https://www.truegaming.net/home/feed/" },
    { name: "IGN الشرق الأوسط", url: "https://me.ign.com/ar/feed.xml" },
    { name: "زيباد", url: "https://z-pad.net/feed/" },
    { name: "ديجيتال آي", url: "https://d-eye.net/feed/" }
];

app.get('/api/news', async (req, res) => {
    try {
        let feedPromises = SOURCES.map(async (source) => {
            try {
                const feed = await parser.parseURL(source.url);
                return feed.items.map(item => ({
                    title: item.title,
                    link: item.link,
                    pubDate: item.pubDate,
                    sourceName: source.name,
                    // محاولة جلب الصورة إذا كانت موجودة في المحتوى
                    image: item.enclosure ? item.enclosure.url : null 
                }));
            } catch (err) {
                console.error(`خطأ في جلب مصدر ${source.name}`);
                return [];
            }
        });

        const results = await Promise.all(feedPromises);
        let combinedNews = [].concat(...results);

        // ترتيب الأخبار: الأحدث أولاً
        combinedNews.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

        res.status(200).json({
            status: "success",
            count: combinedNews.length,
            data: combinedNews
        });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

module.exports = app;
