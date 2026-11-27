export const SITE = {
  title: 'PM Library',
  description:
    'サンフランシスコのスタートアップでプロダクトマネージャーをしています。日本語では読めない、プロダクトマネジメントに関する深い分析記事・エッセイをキュレート・翻訳し、公開しています。',
  icon: '/wp-content/uploads/2021/12/stay-3.jpg',
  // Same order as the WordPress.com menu.
  nav: [
    { label: 'ホーム', href: '/' },
    { label: 'About us', href: '/about-us/' },
    { label: 'X', href: 'https://twitter.com/PMLibraries' },
    { label: 'プロダクトマネージャー', href: '/プロダクトマネージャーの記事/' },
    { label: '読みものリスト', href: '/my-reading-list/' },
    { label: 'お問い合わせ', href: '/お問い合わせ/' },
  ],
  social: [
    { label: 'X (Twitter)', href: 'https://twitter.com/PMLibraries' },
    { label: 'Facebook', href: 'https://www.facebook.com/pmlibraries/' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/company/pm-library' },
  ],
  // Google Form whose answers land in the subscriber Sheet the GAS mailer reads.
  subscribeForm: 'https://docs.google.com/forms/d/e/1FAIpQLSewn_x2TpsUUtiKyRuk6C0avK-kyBd3QBVl6flQhDo8mblmWA/viewform',
  // The WordPress "人気記事" widget, by wpId.
  popular: [2708, 1023, 2463, 2429, 2141],
  authors: [
    {
      name: 'Eugene Wei',
      handle: 'eugenewei',
      page: '/eugene-wei/',
      bio: 'Amazon、Hulu、Early、Flipboard、Oculusでプロダクトマネージャー、プロダクト担当副社長、Head of Productを歴任。',
      more: '彼の記事を読む',
    },
    {
      name: 'Brandon Chu',
      handle: 'BrandonMChu',
      page: '/brandon-chu/',
      bio: 'ShopifyのVP of Product Acceleration、エンジェル投資家。',
      more: '彼の記事を読む',
    },
    {
      name: 'Packy McCormick',
      handle: 'packyM',
      page: '/packy-mccormick￼￼/',
      bio: 'Not Boringの著者。Not Boring Capital創業者。',
      more: '彼の記事を読む',
    },
    {
      name: 'Marty Cagan',
      handle: 'cagan',
      page: '/marty-cagan/',
      bio: 'Silicon Valley Product Groupの創業者。『INSPIRED』の著者。',
      more: '彼の記事を読む',
    },
    {
      name: 'Li Jin',
      handle: 'ljin18',
      page: '/li-jin-2/',
      bio: 'Variant、Atelier、Side Hustle Stack、Li and Nathanの共同創業者。',
      more: '彼女の記事を読む',
    },
  ],
};

// List pages name what they hold, so search engines don't see the site description on every one.
export const listDescription = (label: string, posts: { data: { title: string } }[]) => {
  const text = `${label}の翻訳記事一覧（${posts.length}本）：${posts.map((p) => p.data.title).join('、')}`;
  return text.length > 160 ? text.slice(0, 159) + '…' : text;
};

// First words of a Markdown body, for pages that have no excerpt.
export const summarize = (markdown: string) => {
  const text = markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/^[#>\-*\s]+/gm, '')
    .replace(/[*_`\\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > 160 ? text.slice(0, 159) + '…' : text;
};

export const formatDate =(d: Date) =>
  d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Los_Angeles' });

// WordPress dates are Pacific time; archive URLs follow them.
export const yearMonth = (d: Date) => {
  const [y, m] = d
    .toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', timeZone: 'America/Los_Angeles' })
    .split('-');
  return { y, m };
};
