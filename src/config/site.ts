export const site = {
  name: '電子書籍の虫',
  alternateName: '電子書籍の虫',
  tagline: '電子書籍・Kindleの読書ガイド',
  homeTitle: '電子書籍の読み方・おすすめ・お得情報',
  description:
    'Kindle、電子書籍リーダー、読書アプリのレビューやセール情報を発信するメディアです。デジタル読書の楽しみ方を、わかりやすくお届けします。',
  url: 'https://densho.tadeku.net',
  author: '電子書籍の虫編集部',
  locale: 'ja_JP',
  language: 'ja',
  email: 'info@tadeku.net',
  social: {
    x: '',
  },
} as const;

export const editor = {
  name: '電子書籍の虫編集部',
  role: '編集・運営',
  bio: 'Kindleや電子書籍リーダー、読書アプリを日々使いながら、デジタル読書のコツやお得な買い方を調べて発信しています。',
  aboutUrl: '/about/',
} as const;

export const affiliate = {
  tag: import.meta.env.PUBLIC_AMAZON_ASSOCIATE_TAG ?? 'densho-tadeku-22',
  disclosure:
    '当サイトは、Amazon.co.jpを宣伝しリンクすることによってサイト運営者が紹介料を得られる仕組みを利用しています。',
  articleDisclosure:
    'Amazonのアソシエイトとして電子書籍の虫は適格販売により収入を得ています。',
} as const;

/** 記事カテゴリ */
export const categories = {
  kindle: {
    id: 'kindle' as const,
    name: 'Kindle・リーダー',
    shortName: 'Kindle',
    description: 'Kindle端末、電子書籍リーダーのレビュー・比較・活用法',
  },
  tips: {
    id: 'tips' as const,
    name: '読書術・ハウツー',
    shortName: '読書術',
    description: 'ハイライト、メモ、読書習慣などデジタル読書のコツ',
  },
  deals: {
    id: 'deals' as const,
    name: 'セール・キャンペーン',
    shortName: 'セール',
    description: 'Kindleセール、ポイント還元、無料キャンペーン情報',
  },
  app: {
    id: 'app' as const,
    name: '読書アプリ',
    shortName: 'アプリ',
    description: 'Kindleアプリ、BookWalker、楽天Koboなど読書アプリの比較',
  },
  manga: {
    id: 'manga' as const,
    name: 'マンガ・コミック',
    shortName: 'マンガ',
    description: '電子版マンガの読み方、おすすめ作品、セール情報',
  },
} as const;

export type CategoryId = keyof typeof categories;

/** トップで紹介するトピック（記事公開前のプレビュー用） */
export const upcomingTopics = [
  {
    title: 'Kindle Paperwhite 徹底レビュー',
    category: 'kindle' as CategoryId,
    description: '最新モデルの画面・バッテリー・読み心地を実機で検証します。',
  },
  {
    title: 'Kindleセールの見方・買い時ガイド',
    category: 'deals' as CategoryId,
    description: '日替わりセールやポイント還元を活用してお得に買うコツを解説します。',
  },
  {
    title: '電子書籍リーダー おすすめ比較',
    category: 'kindle' as CategoryId,
    description: 'Kindle・Kobo・楽天Koboなど主要端末を用途別に比較します。',
  },
  {
    title: 'KindleハイライトをObsidianに同期する方法',
    category: 'tips' as CategoryId,
    description: '読書メモを知識管理ツールに活かすワークフローを紹介します。',
  },
] as const;

/** サイドバーに表示するサイト紹介 */
export const sidebarProfile = {
  beforeOperator:
    '電子書籍の虫は、Kindle書籍を中心に、電子書籍のセール情報や新刊情報を紹介するサイトです。小説を書いたり読んだりする人のためのWebメディア「',
  operator: {
    name: '蓼食う本の虫',
    href: 'https://tadeku.net/',
  },
  afterOperator:
    '」が運営していますが、電子書籍の虫では、コミック情報なども取り扱います！',
} as const;

/** サイドバーに掲載する関連サイト */
export const relatedSites = [
  {
    name: '蓼食う本の虫',
    href: 'https://tadeku.net/',
    description: '本好き・物書き向けのWebメディア',
  },
  {
    name: 'tadeku-tools',
    href: 'https://tools.tadeku.net/',
    description: '小説執筆を楽しくするツール集',
  },
  {
    name: 'First Books',
    href: 'https://first-books.tadeku.net/',
    description: '本のおすすめランキング',
  },
] as const;
