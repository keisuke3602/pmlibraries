import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE } from '../site';

export async function GET(context) {
  const posts = (await getCollection('posts')).sort((a, b) => +b.data.date - +a.data.date);
  return rss({
    title: SITE.title,
    description: SITE.description,
    site: context.site,
    items: posts.map(({ data }) => ({
      title: data.title,
      pubDate: data.date,
      description: data.excerpt,
      link: encodeURI(data.permalink),
      categories: data.categories.map((c) => c.name),
    })),
  });
}
