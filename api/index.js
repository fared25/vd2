const express = require('express');
const RSSParser = require('rss-parser');
const cors = require('cors');

const app = express();
const parser = new RSSParser();

app.use(cors());

// المسار الرئيسي (/) هو الذي سيجلب الأخبار فور فتح الرابط
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
            } catch (err) {
                console.error(`خطأ في مصدر ${source.name}`);
                return [];
            }
        });

        const results = await Promise.all(feedPromises);
        let combinedNews = [].concat(...results);

        // ترتيب الأخبار من الأحدث للأقدم
        combinedNews.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

        res.status(200).json(combinedNews);
    } catch (error) {
        res.status(500).json({ error: "فشل جلب الأخبار" });
    }
});

module.exports = app;
