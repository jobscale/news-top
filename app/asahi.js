const baseUrl = 'https://news.tv-asahi.co.jp';
const list = [
  `${baseUrl}/api/lchara_list.php?appcode=n4tAMkmEnY&page=0001`,
];
const userAgent = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const headers = { 'accept-language': 'ja', 'user-agent': userAgent };

export const newsFetch = async () => {
  const titles = [];
  for (const url of list) {
    await fetch(url, { headers })
    .then(res => res.json())
    .then(body => {
      const anchorList = body.item.map(item => {
        const href = `${baseUrl}${item.link}`;
        return { title: item.title.trim(), href, media: 'A' };
      });
      titles.push(...anchorList);
    });
  }
  return titles;
};
