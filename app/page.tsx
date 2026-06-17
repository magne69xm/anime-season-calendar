import { fetchCatalogSince } from "@/lib/anilist";
import { groupAnimeByYearMonth } from "@/lib/schedule";
import { CalendarBoard } from "@/components/CalendarBoard";

export const revalidate = 3600;

export default async function HomePage() {
  const animeList = await fetchCatalogSince(2020);
  const airingCount = animeList.filter((item) => item.nextAiringAt).length;
  const yearBlocks = groupAnimeByYearMonth(animeList);

  return (
    <main className="page-shell">
      <section className="hero">
        <h1>追番日历</h1>
        <p>
          收录 2020 年至今新番，按年份与月份整理。点击「加入追番」后会保存在浏览器里，
          方便你只看自己的追番清单。
        </p>
      </section>

      <CalendarBoard yearBlocks={yearBlocks} totalCount={animeList.length} />

      <p className="footer-note">
        数据来源：AniList；中文名来自 Bangumi。页面每小时更新一次；追番记录保存在你的浏览器本地，不会上传。
        当前共 {airingCount} 部番剧有明确更新时间。
      </p>
    </main>
  );
}
