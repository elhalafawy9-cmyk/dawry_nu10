import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Team, Match } from '../App';
import { getDynamicR32Matchups } from './knockoutDraw';
import { TEAM_LOGOS_MAP } from './teamLogos';

export interface StandingsExportOptions {
  teams: Team[];
  matches?: Match[];
  getGroupStandings?: (group: string) => Team[];
  seasonName: string;
  academicYear: string;
  selectedGroup?: string; // 'all' or 'A'..'H'
  scheduledMatchesCount?: number;
  totalMatchesCount?: number;
  onProgress?: (status: string) => void;
}

// Fallback helper to calculate standings for a group if getGroupStandings is not provided
function getGroupTeamsFallback(teams: Team[], group: string): Team[] {
  return teams
    .filter((t) => t.group === group)
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.gd !== a.gd) return b.gd - a.gd;
      if (b.gf !== a.gf) return b.gf - a.gf;
      return a.name.localeCompare(b.name, 'ar');
    });
}

export async function exportGroupStandingsPDF(options: StandingsExportOptions): Promise<void> {
  const {
    teams,
    matches = [],
    getGroupStandings,
    seasonName,
    academicYear,
    selectedGroup = 'all',
    onProgress,
  } = options;

  onProgress?.('جارٍ تجهيز بيانات وإحصائيات المجموعات...');

  const resolveStandings = (grp: string): Team[] => {
    if (getGroupStandings) {
      return getGroupStandings(grp);
    }
    return getGroupTeamsFallback(teams, grp);
  };

  const isAllGroups = selectedGroup === 'all';
  const pagesData: string[][] = isAllGroups
    ? [
        ['A', 'B', 'C', 'D'],
        ['E', 'F', 'G', 'H'],
      ]
    : [[selectedGroup]];

  // Global calculations across tournament
  const allGroups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  let totalTournamentGoals = 0;
  let totalFinishedGroupMatches = 0;

  allGroups.forEach(grp => {
    const grpTeams = resolveStandings(grp);
    grpTeams.forEach(t => {
      totalTournamentGoals += (t.gf || 0);
    });
  });
  // Since each goal is counted for a team, total goals scored = sum(t.gf)
  // Total finished group matches
  totalFinishedGroupMatches = matches.filter(
    m => m.stage === 'group' && m.status === 'finished'
  ).length;

  const formattedDate = new Date().toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedTime = new Date().toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const tempContainer = document.createElement('div');
  tempContainer.style.position = 'fixed';
  tempContainer.style.top = '-99999px';
  tempContainer.style.left = '-99999px';
  tempContainer.style.width = '1120px';
  tempContainer.style.backgroundColor = '#ffffff';
  tempContainer.style.zIndex = '-1000';
  tempContainer.dir = 'rtl';
  document.body.appendChild(tempContainer);

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pdfWidth = 210;
  const pdfHeight = 297;
  const filename = isAllGroups
    ? `سجل_ترتيب_مجموعات_دوري_جامعة_النيل_${new Date().toISOString().slice(0, 10)}.pdf`
    : `سجل_ترتيب_المجموعة_${selectedGroup}_دوري_جامعة_النيل_${new Date().toISOString().slice(0, 10)}.pdf`;

  try {
    // Wait for fonts to be loaded
    if (document.fonts) {
      try {
        await document.fonts.ready;
      } catch {
        // ignore font ready errors
      }
    }

    for (let pageIndex = 0; pageIndex < pagesData.length; pageIndex++) {
      onProgress?.(`جارٍ إنشاء وتنسيق الصفحة ${pageIndex + 1} من ${pagesData.length}...`);

      const currentGroups = pagesData[pageIndex];

      const pageWrapper = document.createElement('div');
      pageWrapper.style.width = '1120px';
      pageWrapper.style.minHeight = '1584px'; // ~A4 ratio at 1120px
      pageWrapper.style.padding = '36px 44px';
      pageWrapper.style.boxSizing = 'border-box';
      pageWrapper.style.backgroundColor = '#ffffff';
      pageWrapper.style.color = '#0f172a';
      pageWrapper.style.fontFamily = "'Tajawal', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
      pageWrapper.style.display = 'flex';
      pageWrapper.style.flexDirection = 'column';
      pageWrapper.style.justifyContent = 'space-between';
      pageWrapper.dir = 'rtl';

      // 1. PAGE HEADER
      const headerHtml = `
        <div style="border-bottom: 3px solid #059669; padding-bottom: 16px; margin-bottom: 18px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 16px;">
              <div style="width: 58px; height: 58px; border-radius: 16px; background: linear-gradient(135deg, #059669, #065f46); display: flex; align-items: center; justify-content: center; color: #ffffff; font-size: 30px; font-weight: 900; box-shadow: 0 4px 12px rgba(5,150,105,0.3);">
                🏆
              </div>
              <div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="background-color: #ecfdf5; color: #047857; font-size: 12px; font-weight: 800; padding: 3px 12px; border-radius: 9999px; border: 1px solid #a7f3d0;">
                    السجل الرسمي للبطولة • وثيقة معتمدة
                  </span>
                  <span style="color: #64748b; font-size: 12px; font-weight: 700;">
                    العام الأكاديمي: ${academicYear}
                  </span>
                </div>
                <h1 style="font-size: 23px; font-weight: 900; color: #0f172a; margin: 4px 0 0 0; line-height: 1.25;">
                  دوري جامعة النيل — السجل الرسمي لترتيب المجموعات
                </h1>
                <p style="font-size: 12.5px; color: #475569; margin: 3px 0 0 0;">
                  ${seasonName} • 48 فريقاً في 8 مجموعات (A-H) • يصعد أول 4 فرق لدور الـ 32 الإقصائي
                </p>
              </div>
            </div>

            <div style="text-align: left; background-color: #f8fafc; padding: 10px 16px; border-radius: 12px; border: 1px solid #e2e8f0;">
              <div style="font-size: 11px; color: #64748b; font-weight: 700;">تاريخ وتوقيت الإصدار:</div>
              <div style="font-size: 12.5px; font-weight: 900; color: #0f172a; font-family: monospace; direction: ltr; text-align: right;">
                ${formattedDate} • ${formattedTime}
              </div>
              <div style="font-size: 11px; color: #059669; font-weight: 800; margin-top: 2px;">
                معتمد رسمياً من اللجنة المنظمة ✓
              </div>
            </div>
          </div>

          <!-- Quick Metrics Bar -->
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 14px; padding-top: 14px; border-top: 1px dashed #cbd5e1;">
            <div style="background-color: #f8fafc; padding: 8px 12px; border-radius: 8px; border: 1px solid #e2e8f0; text-align: center;">
              <span style="font-size: 11px; color: #64748b; display: block; font-weight: 600;">الفرق المشاركة</span>
              <strong style="font-size: 15px; font-weight: 900; color: #0f172a;">${teams.length} فريقاً (8 مجموعات)</strong>
            </div>
            <div style="background-color: #ecfdf5; padding: 8px 12px; border-radius: 8px; border: 1px solid #a7f3d0; text-align: center;">
              <span style="font-size: 11px; color: #047857; display: block; font-weight: 600;">بطاقات الصعود لدور الـ 32</span>
              <strong style="font-size: 15px; font-weight: 900; color: #047857;">32 مقعداً (أول 4 من كل م.)</strong>
            </div>
            <div style="background-color: #f8fafc; padding: 8px 12px; border-radius: 8px; border: 1px solid #e2e8f0; text-align: center;">
              <span style="font-size: 11px; color: #64748b; display: block; font-weight: 600;">مباريات دور المجموعات</span>
              <strong style="font-size: 15px; font-weight: 900; color: #0f172a;">
                ${totalFinishedGroupMatches} مكتملة / 120 مباراة
              </strong>
            </div>
            <div style="background-color: #fef3c7; padding: 8px 12px; border-radius: 8px; border: 1px solid #fde68a; text-align: center;">
              <span style="font-size: 11px; color: #92400e; display: block; font-weight: 600;">نطاق التقرير المعروض</span>
              <strong style="font-size: 15px; font-weight: 900; color: #92400e;">
                ${isAllGroups ? `المجموعات (${currentGroups.join(' - ')}) [صفحة ${pageIndex + 1} من ${pagesData.length}]` : `المجموعة ${selectedGroup} (تفصيلي)`}
              </strong>
            </div>
          </div>
        </div>
      `;

      // 2. CONTENT (TABLES OR DETAILED SINGLE GROUP)
      let tablesHtml = `<div style="display: flex; flex-direction: column; gap: 16px; flex-grow: 1;">`;

      if (isAllGroups) {
        // Render 4 compact groups per page
        for (const grp of currentGroups) {
          const groupTeams = resolveStandings(grp);

          tablesHtml += `
            <div style="border: 1px solid #cbd5e1; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.03); background-color: #ffffff;">
              <!-- Group Header -->
              <div style="background-color: #f1f5f9; padding: 8px 14px; border-bottom: 2px solid #059669; display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="background-color: #059669; color: #ffffff; font-weight: 900; font-size: 13px; width: 26px; height: 26px; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center;">
                    ${grp}
                  </span>
                  <strong style="font-size: 14.5px; font-weight: 900; color: #0f172a;">
                    ترتيب المجموعة (${grp})
                  </strong>
                  <span style="font-size: 11.5px; color: #64748b;">(6 فرق • 15 مباراة)</span>
                </div>
                <span style="font-size: 11px; font-weight: 800; color: #047857; background-color: #ecfdf5; padding: 2px 8px; border-radius: 6px; border: 1px solid #a7f3d0;">
                  أول 4 فرق تتأهل لدور الـ 32 🏆
                </span>
              </div>

              <!-- Table -->
              <table style="width: 100%; border-collapse: collapse; text-align: right; font-size: 12px;">
                <thead>
                  <tr style="background-color: #f8fafc; color: #475569; border-bottom: 1px solid #cbd5e1; font-size: 11px;">
                    <th style="padding: 6px 10px; text-align: center; width: 42px;">المركز</th>
                    <th style="padding: 6px 12px;">اسم الفريق</th>
                    <th style="padding: 6px 8px; text-align: center; width: 45px;">لعب</th>
                    <th style="padding: 6px 8px; text-align: center; width: 45px;">فاز</th>
                    <th style="padding: 6px 8px; text-align: center; width: 45px;">تعادل</th>
                    <th style="padding: 6px 8px; text-align: center; width: 45px;">خسر</th>
                    <th style="padding: 6px 8px; text-align: center; width: 45px;">له</th>
                    <th style="padding: 6px 8px; text-align: center; width: 45px;">عليه</th>
                    <th style="padding: 6px 8px; text-align: center; width: 50px;">الفارق</th>
                    <th style="padding: 6px 12px; text-align: center; width: 55px; background-color: #f1f5f9; font-weight: 900; color: #047857;">النقاط</th>
                    <th style="padding: 6px 12px; text-align: center; width: 130px;">حالة التأهل</th>
                  </tr>
                </thead>
                <tbody>
          `;

          groupTeams.forEach((team, idx) => {
            const rank = idx + 1;
            const isQualified = idx < 4;
            const rowBg = isQualified ? (idx % 2 === 0 ? '#ffffff' : '#fcfdfd') : '#fff1f2';
            const borderStyle = isQualified ? 'border-right: 4px solid #10b981;' : 'border-right: 4px solid #f43f5e;';

            tablesHtml += `
              <tr style="border-bottom: 1px solid #e2e8f0; background-color: ${rowBg}; ${borderStyle}">
                <td style="padding: 5px 10px; text-align: center;">
                  <span style="display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 5px; font-weight: 900; font-size: 11px; ${
                    isQualified ? 'background-color: #ecfdf5; color: #047857; border: 1px solid #a7f3d0;' : 'background-color: #f1f5f9; color: #64748b;'
                  }">
                    ${rank}
                  </span>
                </td>
                <td style="padding: 5px 12px; font-weight: 800; color: #0f172a; font-size: 12.5px;">
                  ${team.name}
                  ${rank === 1 ? ' 🥇' : rank === 2 ? ' 🥈' : rank === 3 ? ' 🥉' : ''}
                </td>
                <td style="padding: 5px 8px; text-align: center; font-weight: 700; font-family: monospace;">${team.played}</td>
                <td style="padding: 5px 8px; text-align: center; font-weight: 700; color: #059669; font-family: monospace;">${team.won}</td>
                <td style="padding: 5px 8px; text-align: center; font-weight: 700; color: #d97706; font-family: monospace;">${team.drawn}</td>
                <td style="padding: 5px 8px; text-align: center; font-weight: 700; color: #dc2626; font-family: monospace;">${team.lost}</td>
                <td style="padding: 5px 8px; text-align: center; font-family: monospace; color: #475569;">${team.gf}</td>
                <td style="padding: 5px 8px; text-align: center; font-family: monospace; color: #475569;">${team.ga}</td>
                <td style="padding: 5px 8px; text-align: center; font-weight: 800; font-family: monospace; color: ${team.gd > 0 ? '#059669' : team.gd < 0 ? '#dc2626' : '#64748b'};">
                  ${team.gd > 0 ? `+${team.gd}` : team.gd}
                </td>
                <td style="padding: 5px 12px; text-align: center; font-weight: 900; font-size: 13.5px; color: #047857; background-color: #f0fdf4; font-family: monospace;">
                  ${team.points}
                </td>
                <td style="padding: 5px 12px; text-align: center;">
                  ${isQualified ? `
                    <span style="display: inline-block; padding: 2px 7px; border-radius: 9999px; background-color: #ecfdf5; color: #047857; font-size: 10.5px; font-weight: 800; border: 1px solid #a7f3d0;">
                      ✓ صعود لدور الـ 32
                    </span>
                  ` : `
                    <span style="display: inline-block; padding: 2px 7px; border-radius: 9999px; background-color: #fef2f2; color: #b91c1c; font-size: 10.5px; font-weight: 700; border: 1px solid #fecaca;">
                      مغادرة المسابقة
                    </span>
                  `}
                </td>
              </tr>
            `;
          });

          tablesHtml += `
                </tbody>
              </table>
            </div>
          `;
        }

        // On page 2 (Page 2 of 2 in all groups), add certification block at the bottom
        if (pageIndex === 1) {
          tablesHtml += `
            <div style="margin-top: 8px; background-color: #f8fafc; border: 1px dashed #059669; border-radius: 12px; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong style="color: #047857; font-size: 13px; display: block;">
                  اعتماد جدول المجموعات الرسمي لدوري جامعة النيل 🏆
                </strong>
                <span style="font-size: 11px; color: #64748b;">
                  تم حسم صعود الفرق الأربعة الأولى من كل مجموعة (إجمالي 32 فريقاً) لمرحلة خروج المغلوب (Knockout Bracket).
                </span>
              </div>
              <div style="display: flex; gap: 32px; text-align: center;">
                <div>
                  <div style="font-size: 11px; color: #64748b; margin-bottom: 18px;">مسؤول لجنة الحكام</div>
                  <div style="border-bottom: 1px solid #cbd5e1; width: 100px;"></div>
                </div>
                <div>
                  <div style="font-size: 11px; color: #64748b; margin-bottom: 18px;">مدير البطولة والنشاط الرياضي</div>
                  <div style="border-bottom: 1px solid #cbd5e1; width: 120px;"></div>
                </div>
              </div>
            </div>
          `;
        }
      } else {
        // Single group detailed report
        const grp = selectedGroup;
        const groupTeams = resolveStandings(grp);
        const qualifiedTeams = groupTeams.slice(0, 4);
        const topScorerTeam = [...groupTeams].sort((a, b) => b.gf - a.gf)[0];
        const bestDefenseTeam = [...groupTeams].sort((a, b) => a.ga - b.ga)[0];
        const totalGroupGoals = groupTeams.reduce((sum, t) => sum + (t.gf || 0), 0);
        const totalGroupPlayed = groupTeams.reduce((sum, t) => sum + (t.played || 0), 0) / 2;

        tablesHtml += `
          <!-- Main Table -->
          <div style="border: 2px solid #059669; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.04); background-color: #ffffff;">
            <div style="background: linear-gradient(135deg, #059669, #047857); padding: 12px 18px; color: #ffffff; display: flex; justify-content: space-between; align-items: center;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="background-color: #ffffff; color: #047857; font-weight: 900; font-size: 16px; width: 32px; height: 32px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.15);">
                  ${grp}
                </span>
                <div>
                  <strong style="font-size: 17px; font-weight: 900;">
                    جدول الترتيب الرسمي — المجموعة (${grp})
                  </strong>
                  <div style="font-size: 12px; opacity: 0.9;">
                    6 فرق تتنافس بنظام الدوري المصغر (15 مباراة إجمالية)
                  </div>
                </div>
              </div>
              <span style="font-size: 12.5px; font-weight: 800; background-color: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.4);">
                يصعد أول 4 فرق لدور الـ 32 🏆
              </span>
            </div>

            <table style="width: 100%; border-collapse: collapse; text-align: right; font-size: 13.5px;">
              <thead>
                <tr style="background-color: #f8fafc; color: #475569; border-bottom: 2px solid #cbd5e1; font-size: 12.5px;">
                  <th style="padding: 10px 14px; text-align: center; width: 50px;">المركز</th>
                  <th style="padding: 10px 16px;">اسم الفريق</th>
                  <th style="padding: 10px 10px; text-align: center; width: 55px;">لعب</th>
                  <th style="padding: 10px 10px; text-align: center; width: 55px;">فاز</th>
                  <th style="padding: 10px 10px; text-align: center; width: 55px;">تعادل</th>
                  <th style="padding: 10px 10px; text-align: center; width: 55px;">خسر</th>
                  <th style="padding: 10px 10px; text-align: center; width: 55px;">له</th>
                  <th style="padding: 10px 10px; text-align: center; width: 55px;">عليه</th>
                  <th style="padding: 10px 10px; text-align: center; width: 60px;">الفارق</th>
                  <th style="padding: 10px 16px; text-align: center; width: 75px; background-color: #f1f5f9; font-weight: 900; color: #047857;">النقاط</th>
                  <th style="padding: 10px 16px; text-align: center; width: 160px;">حالة التأهل</th>
                </tr>
              </thead>
              <tbody>
        `;

        groupTeams.forEach((team, idx) => {
          const rank = idx + 1;
          const isQualified = idx < 4;
          const rowBg = isQualified ? (idx % 2 === 0 ? '#ffffff' : '#fcfdfd') : '#fff1f2';
          const borderStyle = isQualified ? 'border-right: 5px solid #10b981;' : 'border-right: 5px solid #f43f5e;';

          tablesHtml += `
            <tr style="border-bottom: 1px solid #e2e8f0; background-color: ${rowBg}; ${borderStyle}">
              <td style="padding: 9px 14px; text-align: center;">
                <span style="display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 7px; font-weight: 900; font-size: 13px; ${
                  isQualified ? 'background-color: #ecfdf5; color: #047857; border: 1px solid #a7f3d0;' : 'background-color: #f1f5f9; color: #64748b;'
                }">
                  ${rank}
                </span>
              </td>
              <td style="padding: 9px 16px; font-weight: 800; color: #0f172a; font-size: 14px;">
                ${team.name}
                ${rank === 1 ? ' 🥇' : rank === 2 ? ' 🥈' : rank === 3 ? ' 🥉' : ''}
              </td>
              <td style="padding: 9px 10px; text-align: center; font-weight: 700; font-family: monospace;">${team.played}</td>
              <td style="padding: 9px 10px; text-align: center; font-weight: 700; color: #059669; font-family: monospace;">${team.won}</td>
              <td style="padding: 9px 10px; text-align: center; font-weight: 700; color: #d97706; font-family: monospace;">${team.drawn}</td>
              <td style="padding: 9px 10px; text-align: center; font-weight: 700; color: #dc2626; font-family: monospace;">${team.lost}</td>
              <td style="padding: 9px 10px; text-align: center; font-family: monospace; color: #475569;">${team.gf}</td>
              <td style="padding: 9px 10px; text-align: center; font-family: monospace; color: #475569;">${team.ga}</td>
              <td style="padding: 9px 10px; text-align: center; font-weight: 800; font-family: monospace; color: ${team.gd > 0 ? '#059669' : team.gd < 0 ? '#dc2626' : '#64748b'};">
                ${team.gd > 0 ? `+${team.gd}` : team.gd}
              </td>
              <td style="padding: 9px 16px; text-align: center; font-weight: 900; font-size: 16px; color: #047857; background-color: #f0fdf4; font-family: monospace;">
                ${team.points}
              </td>
              <td style="padding: 9px 16px; text-align: center;">
                ${isQualified ? `
                  <span style="display: inline-block; padding: 3px 10px; border-radius: 9999px; background-color: #ecfdf5; color: #047857; font-size: 11.5px; font-weight: 800; border: 1px solid #a7f3d0;">
                    ✓ صعود لدور الـ 32
                  </span>
                ` : `
                  <span style="display: inline-block; padding: 3px 10px; border-radius: 9999px; background-color: #fef2f2; color: #b91c1c; font-size: 11.5px; font-weight: 700; border: 1px solid #fecaca;">
                    مغادرة المسابقة
                  </span>
                `}
              </td>
            </tr>
          `;
        });

        tablesHtml += `
              </tbody>
            </table>
          </div>

          <!-- Group Statistical Highlights -->
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-top: 10px;">
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; text-align: center;">
              <span style="font-size: 12px; color: #64748b; font-weight: 700; display: block; margin-bottom: 4px;">متصدر المجموعة</span>
              <strong style="font-size: 15px; font-weight: 900; color: #059669;">${groupTeams[0]?.name || '-'}</strong>
              <span style="font-size: 11px; color: #047857; display: block; margin-top: 2px;">(${groupTeams[0]?.points || 0} نقطة)</span>
            </div>
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; text-align: center;">
              <span style="font-size: 12px; color: #64748b; font-weight: 700; display: block; margin-bottom: 4px;">الهجوم الأقوى</span>
              <strong style="font-size: 15px; font-weight: 900; color: #0f172a;">${topScorerTeam?.name || '-'}</strong>
              <span style="font-size: 11px; color: #64748b; display: block; margin-top: 2px;">(${topScorerTeam?.gf || 0} أهداف)</span>
            </div>
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; text-align: center;">
              <span style="font-size: 12px; color: #64748b; font-weight: 700; display: block; margin-bottom: 4px;">الدفاع الأقوى</span>
              <strong style="font-size: 15px; font-weight: 900; color: #0f172a;">${bestDefenseTeam?.name || '-'}</strong>
              <span style="font-size: 11px; color: #64748b; display: block; margin-top: 2px;">(استقبل ${bestDefenseTeam?.ga || 0} فقط)</span>
            </div>
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; text-align: center;">
              <span style="font-size: 12px; color: #64748b; font-weight: 700; display: block; margin-bottom: 4px;">أهداف المجموعة</span>
              <strong style="font-size: 15px; font-weight: 900; color: #d97706;">${totalGroupGoals} هدفاً</strong>
              <span style="font-size: 11px; color: #64748b; display: block; margin-top: 2px;">في ${totalGroupPlayed} مباريات ملعوبة</span>
            </div>
          </div>

          <!-- Qualified Teams Cards -->
          <div style="background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 14px; padding: 16px; margin-top: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <strong style="font-size: 14px; color: #0f172a; font-weight: 900;">
                قائمة المتأهلين الرسمية لدور الـ 32 من المجموعة (${grp})
              </strong>
              <span style="font-size: 11px; font-weight: 800; color: #047857; background-color: #ecfdf5; padding: 2px 8px; border-radius: 6px; border: 1px solid #a7f3d0;">
                4 مقاعد صعود مؤكدة
              </span>
            </div>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">
              ${qualifiedTeams.map((team, idx) => `
                <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                  <span style="font-size: 10px; color: #64748b; font-weight: 700; display: block;">المركز ${idx + 1}</span>
                  <strong style="font-size: 13.5px; color: #0f172a; font-weight: 800; display: block; margin-top: 2px;">${team.name}</strong>
                  <span style="display: inline-block; margin-top: 4px; padding: 1px 6px; border-radius: 4px; background-color: #ecfdf5; color: #047857; font-size: 10px; font-weight: 800;">
                    ${team.points} نقاط • صاعد ✓
                  </span>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Official Certification Section -->
          <div style="margin-top: 12px; background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 12px; padding: 16px; display: flex; justify-content: space-between; align-items: center;">
            <div style="max-w: 600px;">
              <strong style="color: #059669; font-size: 13px; display: block;">
                اعتماد نتائج وترتيب المجموعة (${grp}) رسمياً 🏆
              </strong>
              <p style="font-size: 11.5px; color: #64748b; margin: 4px 0 0 0;">
                تعتبر هذه النتائج نهائية ومعتمدة بموجب لوائح دوري جامعة النيل لكرة القدم لموسم ${academicYear}.
              </p>
            </div>
            <div style="display: flex; gap: 40px; text-align: center;">
              <div>
                <div style="font-size: 11px; color: #64748b; margin-bottom: 24px;">حكم الساحة / مراقب المباراة</div>
                <div style="border-bottom: 1px solid #94a3b8; width: 120px;"></div>
              </div>
              <div>
                <div style="font-size: 11px; color: #64748b; margin-bottom: 24px;">ختم واعتماد اللجنة الرياضية</div>
                <div style="border-bottom: 1px solid #94a3b8; width: 140px;"></div>
              </div>
            </div>
          </div>
        `;
      }

      tablesHtml += `</div>`;

      // 3. PAGE FOOTER
      const footerHtml = `
        <div style="margin-top: 18px; padding-top: 12px; border-top: 2px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #64748b;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-weight: 800; color: #059669;">دوري جامعة النيل لكرة القدم</span>
            <span>•</span>
            <span>اللجنة العليا لتنظيم البطولة والأنشطة الرياضية © ${new Date().getFullYear()}</span>
          </div>

          <div style="display: flex; align-items: center; gap: 14px;">
            <span>تم التوليد والحفظ إلكترونياً من منصة البطولة</span>
            <span style="background-color: #f1f5f9; padding: 2px 8px; border-radius: 6px; font-weight: 800; color: #0f172a; border: 1px solid #e2e8f0;">
              صفحة ${pageIndex + 1} من ${pagesData.length}
            </span>
          </div>
        </div>
      `;

      pageWrapper.innerHTML = headerHtml + tablesHtml + footerHtml;
      tempContainer.appendChild(pageWrapper);

      // Render to canvas using html2canvas
      const canvas = await html2canvas(pageWrapper, {
        scale: 2, // 2x retina clarity
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.96);

      if (pageIndex > 0) {
        pdf.addPage('a4', 'portrait');
      }

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);

      // Clean up DOM node for next iteration
      tempContainer.removeChild(pageWrapper);
    }

    pdf.save(filename);
  } finally {
    if (document.body.contains(tempContainer)) {
      document.body.removeChild(tempContainer);
    }
  }
}

export interface KnockoutExportOptions {
  teams: Team[];
  matches: Match[];
  getGroupStandings?: (group: string) => Team[];
  seasonName: string;
  academicYear: string;
  onProgress?: (status: string) => void;
}

// Helper to generate a clean, colorful, resilient team badge for PDF rendering
function getTeamBadgeHtml(name: string): string {
  const data = TEAM_LOGOS_MAP[name];
  const primary = data?.primaryColor || '#1e293b';
  const secondary = data?.secondaryColor || '#334155';
  const shortText = data?.shortName || (name.length > 3 ? name.substring(0, 3) : name);
  return `
    <div style="width: 17px; height: 17px; border-radius: 5px; background: linear-gradient(135deg, ${primary}, ${secondary}); display: inline-flex; align-items: center; justify-content: center; font-size: 7.5px; font-weight: 900; color: #ffffff; text-shadow: 0 1px 2px rgba(0,0,0,0.8); flex-shrink: 0; border: 1px solid rgba(255,255,255,0.25); font-family: monospace; box-shadow: 0 1px 3px rgba(0,0,0,0.4);">
      ${shortText}
    </div>
  `;
}

export async function exportKnockoutBracketPDF(options: KnockoutExportOptions): Promise<void> {
  const {
    teams,
    matches = [],
    getGroupStandings,
    seasonName,
    academicYear,
    onProgress,
  } = options;

  onProgress?.('جارٍ تحضير شجرة الأدوار الإقصائية المرئية...');

  const matchMap = new Map<string, Match>();
  matches.forEach(m => matchMap.set(m.id, m));

  const dynamicR32Map = getDynamicR32Matchups(teams, getGroupStandings);

  const getMatchInfo = (id: string, fallbackName: string) => {
    const raw = matchMap.get(id);
    const dyn = dynamicR32Map[id];

    let teamA = raw?.teamA || 'بانتظار المتأهل';
    let teamB = raw?.teamB || 'بانتظار المتأهل';
    let seedA = '';
    let seedB = '';

    if (dyn && (!raw || (raw.status !== 'finished' && raw.scoreA === null && raw.scoreB === null))) {
      teamA = dyn.teamA;
      teamB = dyn.teamB;
      seedA = dyn.seedLabelA;
      seedB = dyn.seedLabelB;
    }

    const sA = raw?.scoreA !== null && raw?.scoreA !== undefined ? raw.scoreA : null;
    const sB = raw?.scoreB !== null && raw?.scoreB !== undefined ? raw.scoreB : null;
    const isFinished = raw?.status === 'finished';
    const isLive = raw?.status === 'live';
    const winnerA = isFinished && sA !== null && sB !== null && sA > sB;
    const winnerB = isFinished && sA !== null && sB !== null && sB > sA;

    return {
      id,
      stageName: raw?.stageName || fallbackName,
      teamA,
      teamB,
      seedA,
      seedB,
      scoreA: sA !== null ? String(sA) : '-',
      scoreB: sB !== null ? String(sB) : '-',
      winnerA,
      winnerB,
      isFinished,
      isLive,
      date: raw?.date || '',
      time: raw?.time || '',
      pitch: raw?.pitch || '',
      isScheduled: Boolean(raw?.isScheduled),
    };
  };

  // Determine Champion & Runner-up
  const finalMatch = getMatchInfo('final', 'المباراة النهائية');
  let championName: string | null = null;
  let runnerUpName: string | null = null;
  if (finalMatch.isFinished) {
    if (finalMatch.winnerA) {
      championName = finalMatch.teamA;
      runnerUpName = finalMatch.teamB;
    } else if (finalMatch.winnerB) {
      championName = finalMatch.teamB;
      runnerUpName = finalMatch.teamA;
    }
  }

  const formattedDate = new Date().toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedTime = new Date().toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const tempContainer = document.createElement('div');
  tempContainer.style.position = 'fixed';
  tempContainer.style.top = '-99999px';
  tempContainer.style.left = '-99999px';
  tempContainer.style.width = '2200px';
  tempContainer.style.backgroundColor = '#080d1a';
  tempContainer.style.zIndex = '-1000';
  tempContainer.dir = 'ltr';
  document.body.appendChild(tempContainer);

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pdfWidth = 297;
  const pdfHeight = 210;

  try {
    if (document.fonts) {
      try {
        await document.fonts.ready;
      } catch {}
    }

    // Helper: Render an authentic sleek match card matching the exact app UI
    const renderVisualCardHtml = (
      m: ReturnType<typeof getMatchInfo>,
      isCenter: boolean = false,
      cardWidth: number = 196
    ) => {
      const winnerA = m.winnerA;
      const winnerB = m.winnerB;
      const badgeA = getTeamBadgeHtml(m.teamA);
      const badgeB = getTeamBadgeHtml(m.teamB);

      let statusText = 'بانتظار الموعد';
      let statusColor = '#64748b';
      if (m.isLive) {
        statusText = 'مباشر ⚽';
        statusColor = '#f43f5e';
      } else if (m.isFinished) {
        statusText = 'FT انتهت ✓';
        statusColor = '#10b981';
      } else if (m.isScheduled) {
        statusText = m.time ? `${m.date.slice(5)} • ${m.time}` : m.date;
        if (m.pitch) statusText += ` (${m.pitch})`;
        statusColor = '#94a3b8';
      }

      return `
        <div style="width: ${cardWidth}px; background: ${isCenter ? 'linear-gradient(135deg, #172554, #0f172a)' : '#0f172a'}; border: 1.5px solid ${isCenter ? '#f59e0b' : m.winnerA || m.winnerB ? '#10b981' : m.isScheduled ? '#2563eb' : '#1e293b'}; border-radius: 9px; padding: 6px 8px; box-sizing: border-box; box-shadow: ${isCenter ? '0 0 20px rgba(245, 158, 11, 0.3)' : '0 4px 12px rgba(0,0,0,0.6)'}; font-family: 'Tajawal', 'Segoe UI', Tahoma, sans-serif; direction: rtl; flex-shrink: 0;">
          <!-- Card Header -->
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e293b; padding-bottom: 3px; margin-bottom: 4.5px;">
            <span style="font-weight: 900; font-size: 8.5px; color: ${isCenter ? '#fbbf24' : '#f59e0b'}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 105px;">
              ${m.stageName}
            </span>
            <span style="font-family: monospace; font-size: 7.5px; color: ${statusColor}; font-weight: 700; white-space: nowrap;">
              ${statusText}
            </span>
          </div>

          <!-- Teams rows -->
          <div style="display: flex; flex-direction: column; gap: 3.5px;">
            <!-- Team A -->
            <div style="display: flex; justify-content: space-between; align-items: center; background-color: ${winnerA ? 'rgba(6, 78, 59, 0.7)' : '#020617'}; border: 1px solid ${winnerA ? '#059669' : '#1e293b'}; border-radius: 6px; padding: 3px 6px;">
              <div style="display: flex; align-items: center; gap: 4px; overflow: hidden; max-width: 142px;">
                ${badgeA}
                <span style="font-weight: 900; font-size: 9.5px; color: ${winnerA ? '#34d399' : '#f8fafc'}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${m.teamA}
                </span>
                ${m.seedA ? `<span style="background-color: #1e1b4b; color: #fbbf24; font-size: 7px; font-weight: 800; padding: 1px 3.5px; border-radius: 3px; border: 1px solid rgba(245,158,11,0.4); white-space: nowrap; flex-shrink: 0;">${m.seedA}</span>` : ''}
              </div>
              <span style="font-family: monospace; font-size: 10px; font-weight: 900; color: ${winnerA ? '#a7f3d0' : '#e2e8f0'}; background: ${winnerA ? '#064e3b' : '#0f172a'}; padding: 1px 5px; border-radius: 4px; border: 1px solid ${winnerA ? '#059669' : '#334155'}; min-width: 16px; text-align: center;">
                ${winnerA ? '👑 ' : ''}${m.scoreA}
              </span>
            </div>

            <!-- Team B -->
            <div style="display: flex; justify-content: space-between; align-items: center; background-color: ${winnerB ? 'rgba(6, 78, 59, 0.7)' : '#020617'}; border: 1px solid ${winnerB ? '#059669' : '#1e293b'}; border-radius: 6px; padding: 3px 6px;">
              <div style="display: flex; align-items: center; gap: 4px; overflow: hidden; max-width: 142px;">
                ${badgeB}
                <span style="font-weight: 900; font-size: 9.5px; color: ${winnerB ? '#34d399' : '#f8fafc'}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${m.teamB}
                </span>
                ${m.seedB ? `<span style="background-color: #1e1b4b; color: #fbbf24; font-size: 7px; font-weight: 800; padding: 1px 3.5px; border-radius: 3px; border: 1px solid rgba(245,158,11,0.4); white-space: nowrap; flex-shrink: 0;">${m.seedB}</span>` : ''}
              </div>
              <span style="font-family: monospace; font-size: 10px; font-weight: 900; color: ${winnerB ? '#a7f3d0' : '#e2e8f0'}; background: ${winnerB ? '#064e3b' : '#0f172a'}; padding: 1px 5px; border-radius: 4px; border: 1px solid ${winnerB ? '#059669' : '#334155'}; min-width: 16px; text-align: center;">
                ${winnerB ? '👑 ' : ''}${m.scoreB}
              </span>
            </div>
          </div>
        </div>
      `;
    };

    // Helper: Render SVG connector brackets bridging 2 parent matches into 1 child match
    const renderConnectorSvg = (direction: 'ltr' | 'rtl', width: number = 24) => {
      if (direction === 'ltr') {
        return `
          <div style="width: ${width}px; height: 100%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <svg style="width: 100%; height: 100%; stroke: #64748b;" viewBox="0 0 24 100" preserveAspectRatio="none" fill="none">
              <path d="M 0 25 H 12 V 50 H 24" stroke-width="2.2" stroke-linecap="round" />
              <path d="M 0 75 H 12 V 50 H 24" stroke-width="2.2" stroke-linecap="round" />
            </svg>
          </div>
        `;
      }
      return `
        <div style="width: ${width}px; height: 100%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          <svg style="width: 100%; height: 100%; stroke: #64748b;" viewBox="0 0 24 100" preserveAspectRatio="none" fill="none">
            <path d="M 24 25 H 12 V 50 H 0" stroke-width="2.2" stroke-linecap="round" />
            <path d="M 24 75 H 12 V 50 H 0" stroke-width="2.2" stroke-linecap="round" />
          </svg>
        </div>
      `;
    };

    // Reusable Pair component (2 R32 matches -> 1 R16 match in vertical center)
    const renderR32Pair = (
      mA: ReturnType<typeof getMatchInfo>,
      mB: ReturnType<typeof getMatchInfo>,
      mR16: ReturnType<typeof getMatchInfo>,
      direction: 'ltr' | 'rtl'
    ) => {
      if (direction === 'ltr') {
        return `
          <div style="display: flex; align-items: center; gap: 4px; height: 320px;">
            <div style="display: flex; flex-direction: column; justify-content: space-around; height: 100%;">
              ${renderVisualCardHtml(mA, false, 196)}
              ${renderVisualCardHtml(mB, false, 196)}
            </div>
            ${renderConnectorSvg('ltr', 24)}
            <div style="display: flex; flex-direction: column; justify-content: center; height: 100%;">
              ${renderVisualCardHtml(mR16, false, 196)}
            </div>
          </div>
        `;
      }
      return `
        <div style="display: flex; align-items: center; gap: 4px; height: 320px;">
          <div style="display: flex; flex-direction: column; justify-content: center; height: 100%;">
            ${renderVisualCardHtml(mR16, false, 196)}
          </div>
          ${renderConnectorSvg('rtl', 24)}
          <div style="display: flex; flex-direction: column; justify-content: space-around; height: 100%;">
            ${renderVisualCardHtml(mA, false, 196)}
            ${renderVisualCardHtml(mB, false, 196)}
          </div>
        </div>
      `;
    };

    // Reusable Quarter Branch (4 R32 -> 2 R16 -> 1 QF in center)
    const renderQuarterBranch = (
      pair1Html: string,
      pair2Html: string,
      mQF: ReturnType<typeof getMatchInfo>,
      direction: 'ltr' | 'rtl'
    ) => {
      if (direction === 'ltr') {
        return `
          <div style="display: flex; align-items: center; gap: 4px; height: 670px;">
            <div style="display: flex; flex-direction: column; justify-content: space-around; height: 100%;">
              ${pair1Html}
              ${pair2Html}
            </div>
            ${renderConnectorSvg('ltr', 24)}
            <div style="display: flex; flex-direction: column; justify-content: center; height: 100%;">
              ${renderVisualCardHtml(mQF, false, 196)}
            </div>
          </div>
        `;
      }
      return `
        <div style="display: flex; align-items: center; gap: 4px; height: 670px;">
          <div style="display: flex; flex-direction: column; justify-content: center; height: 100%;">
            ${renderVisualCardHtml(mQF, false, 196)}
          </div>
          ${renderConnectorSvg('rtl', 24)}
          <div style="display: flex; flex-direction: column; justify-content: space-around; height: 100%;">
            ${pair1Html}
            ${pair2Html}
          </div>
        </div>
      `;
    };

    // Reusable Half (8 R32 -> 4 R16 -> 2 QF -> 1 SF in center)
    const renderHalf = (
      branch1Html: string,
      branch2Html: string,
      mSF: ReturnType<typeof getMatchInfo>,
      semiFinalNumber: 1 | 2,
      direction: 'ltr' | 'rtl'
    ) => {
      if (direction === 'ltr') {
        return `
          <div style="display: flex; align-items: center; gap: 4px; height: 1380px;">
            <div style="display: flex; flex-direction: column; justify-content: space-around; height: 100%;">
              ${branch1Html}
              ${branch2Html}
            </div>
            ${renderConnectorSvg('ltr', 26)}
            <div style="display: flex; flex-direction: column; justify-content: center; height: 100%;">
              <div style="text-align: center; margin-bottom: 6px;">
                <span style="font-size: 9.5px; font-weight: 900; color: #d8b4fe; background-color: rgba(88, 28, 135, 0.7); padding: 2px 10px; border-radius: 9999px; border: 1px solid #a855f7;">
                  نصف النهائي (${semiFinalNumber}) 🏆
                </span>
              </div>
              ${renderVisualCardHtml(mSF, false, 200)}
            </div>
          </div>
        `;
      }
      return `
        <div style="display: flex; align-items: center; gap: 4px; height: 1380px;">
          <div style="display: flex; flex-direction: column; justify-content: center; height: 100%;">
            <div style="text-align: center; margin-bottom: 6px;">
              <span style="font-size: 9.5px; font-weight: 900; color: #d8b4fe; background-color: rgba(88, 28, 135, 0.7); padding: 2px 10px; border-radius: 9999px; border: 1px solid #a855f7;">
                نصف النهائي (${semiFinalNumber}) 🏆
              </span>
            </div>
            ${renderVisualCardHtml(mSF, false, 200)}
          </div>
          ${renderConnectorSvg('rtl', 26)}
          <div style="display: flex; flex-direction: column; justify-content: space-around; height: 100%;">
            ${branch1Html}
            ${branch2Html}
          </div>
        </div>
      `;
    };

    // =========================================================================
    // PAGE 1: FULL SYMMETRICAL KNOCKOUT BRACKET TREE POSTER (LANDSCAPE A4)
    // =========================================================================
    onProgress?.('جارٍ بناء ورسم شجرة الأدوار الإقصائية المتناظرة الكاملة...');

    // Left Half Matches
    const r32_1 = getMatchInfo('r32_1', 'دور 32 (1)');
    const r32_2 = getMatchInfo('r32_2', 'دور 32 (2)');
    const r16_1 = getMatchInfo('r16_1', 'دور 16 (1)');
    const leftPair1 = renderR32Pair(r32_1, r32_2, r16_1, 'ltr');

    const r32_3 = getMatchInfo('r32_3', 'دور 32 (3)');
    const r32_4 = getMatchInfo('r32_4', 'دور 32 (4)');
    const r16_2 = getMatchInfo('r16_2', 'دور 16 (2)');
    const leftPair2 = renderR32Pair(r32_3, r32_4, r16_2, 'ltr');

    const qf1 = getMatchInfo('qf1', 'ربع النهائي (1)');
    const leftBranch1 = renderQuarterBranch(leftPair1, leftPair2, qf1, 'ltr');

    const r32_5 = getMatchInfo('r32_5', 'دور 32 (5)');
    const r32_6 = getMatchInfo('r32_6', 'دور 32 (6)');
    const r16_3 = getMatchInfo('r16_3', 'دور 16 (3)');
    const leftPair3 = renderR32Pair(r32_5, r32_6, r16_3, 'ltr');

    const r32_7 = getMatchInfo('r32_7', 'دور 32 (7)');
    const r32_8 = getMatchInfo('r32_8', 'دور 32 (8)');
    const r16_4 = getMatchInfo('r16_4', 'دور 16 (4)');
    const leftPair4 = renderR32Pair(r32_7, r32_8, r16_4, 'ltr');

    const qf2 = getMatchInfo('qf2', 'ربع النهائي (2)');
    const leftBranch2 = renderQuarterBranch(leftPair3, leftPair4, qf2, 'ltr');

    const sf1 = getMatchInfo('sf1', 'نصف النهائي (1)');
    const leftHalfHtml = renderHalf(leftBranch1, leftBranch2, sf1, 1, 'ltr');

    // Right Half Matches
    const r32_9 = getMatchInfo('r32_9', 'دور 32 (9)');
    const r32_10 = getMatchInfo('r32_10', 'دور 32 (10)');
    const r16_5 = getMatchInfo('r16_5', 'دور 16 (5)');
    const rightPair1 = renderR32Pair(r32_9, r32_10, r16_5, 'rtl');

    const r32_11 = getMatchInfo('r32_11', 'دور 32 (11)');
    const r32_12 = getMatchInfo('r32_12', 'دور 32 (12)');
    const r16_6 = getMatchInfo('r16_6', 'دور 16 (6)');
    const rightPair2 = renderR32Pair(r32_11, r32_12, r16_6, 'rtl');

    const qf3 = getMatchInfo('qf3', 'ربع النهائي (3)');
    const rightBranch1 = renderQuarterBranch(rightPair1, rightPair2, qf3, 'rtl');

    const r32_13 = getMatchInfo('r32_13', 'دور 32 (13)');
    const r32_14 = getMatchInfo('r32_14', 'دور 32 (14)');
    const r16_7 = getMatchInfo('r16_7', 'دور 16 (7)');
    const rightPair3 = renderR32Pair(r32_13, r32_14, r16_7, 'rtl');

    const r32_15 = getMatchInfo('r32_15', 'دور 32 (15)');
    const r32_16 = getMatchInfo('r32_16', 'دور 32 (16)');
    const r16_8 = getMatchInfo('r16_8', 'دور 16 (8)');
    const rightPair4 = renderR32Pair(r32_15, r32_16, r16_8, 'rtl');

    const qf4 = getMatchInfo('qf4', 'ربع النهائي (4)');
    const rightBranch2 = renderQuarterBranch(rightPair3, rightPair4, qf4, 'rtl');

    const sf2 = getMatchInfo('sf2', 'نصف النهائي (2)');
    const rightHalfHtml = renderHalf(rightBranch1, rightBranch2, sf2, 2, 'rtl');

    // Center Final & 3rd Place
    const grandFinal = getMatchInfo('final', 'المباراة النهائية الكبرى 🏆');
    const thirdPlace = getMatchInfo('third_place', 'مباراة المركز الثالث 🥉');

    const page1 = document.createElement('div');
    page1.style.width = '2200px';
    page1.style.height = '1555px';
    page1.style.padding = '22px 30px';
    page1.style.boxSizing = 'border-box';
    page1.style.backgroundColor = '#080d1a';
    page1.style.color = '#f8fafc';
    page1.style.fontFamily = "'Tajawal', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
    page1.style.display = 'flex';
    page1.style.flexDirection = 'column';
    page1.style.justifyContent = 'space-between';
    page1.dir = 'rtl';

    page1.innerHTML = `
      <!-- TOP BANNER (Header) -->
      <div style="border-bottom: 2px solid #1e293b; padding-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <div style="width: 52px; height: 52px; border-radius: 14px; background: linear-gradient(135deg, #f59e0b, #d97706); display: flex; align-items: center; justify-content: center; font-size: 26px; box-shadow: 0 0 20px rgba(245,158,11,0.4); flex-shrink: 0;">
            🏆
          </div>
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="background-color: rgba(245, 158, 11, 0.15); color: #fbbf24; font-size: 11px; font-weight: 800; padding: 2px 10px; border-radius: 9999px; border: 1px solid rgba(245,158,11,0.4);">
                الشجرة الإقصائية العالمية المتوازنة (16 يسار ← النهائي في المنتصف 🏆 → 16 يمين)
              </span>
              <span style="color: #94a3b8; font-size: 11px; font-weight: 700;">
                العام الأكاديمي: ${academicYear}
              </span>
            </div>
            <h1 style="font-size: 22px; font-weight: 900; color: #ffffff; margin: 3px 0 0 0;">
              دوري جامعة النيل لكرة القدم — شجرة ومسار الأدوار الإقصائية المعتمدة 2026
            </h1>
            <p style="font-size: 11px; color: #94a3b8; margin: 2px 0 0 0;">
              الموسم: ${seasonName} • صعود أول 4 فرق من كل مجموعة (32 فريقاً) • تتغير المواجهات تلقائياً بحسب الترتيب الحالي اللحظي للمجموعات
            </p>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 16px;">
          <div style="background-color: rgba(15, 23, 42, 0.8); border: 1px solid rgba(245, 158, 11, 0.3); padding: 6px 12px; border-radius: 10px; text-align: center;">
            <div style="font-size: 9.5px; color: #fbbf24; font-weight: 800;">قاعدة الحظر الصارمة:</div>
            <div style="font-size: 11px; color: #f8fafc; font-weight: 900;">لا يلتقي أي فريقين من نفس المجموعة قبل نصف النهائي 🏆</div>
          </div>

          <div style="text-align: left; background-color: #0f172a; padding: 6px 14px; border-radius: 10px; border: 1px solid #1e293b;">
            <div style="font-size: 9px; color: #94a3b8; font-weight: 700;">تاريخ وتوقيت الإصدار:</div>
            <div style="font-size: 11px; font-weight: 900; color: #38bdf8; font-family: monospace; direction: ltr; text-align: right;">
              ${formattedDate} • ${formattedTime}
            </div>
            <div style="font-size: 9px; color: #10b981; font-weight: 800; margin-top: 1px;">
              وثيقة معتمدة رسمياً ومطابقة للشجرة الإلكترونية ✓
            </div>
          </div>
        </div>
      </div>

      <!-- MAIN BRACKET TREE (LTR container for Left + Center + Right symmetry) -->
      <div dir="ltr" style="display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%; height: 1380px;">
        <!-- ⬅️ LEFT HALF (16 Teams -> 8 R32 -> 4 R16 -> 2 QF -> 1 SF1) -->
        ${leftHalfHtml}

        <!-- Connecting Line SF1 to Final -->
        <div style="width: 26px; height: 100%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          <svg style="width: 100%; height: 20px;" viewBox="0 0 26 20" fill="none">
            <path d="M 0 10 H 26" stroke="#f59e0b" stroke-width="2.5" stroke-dasharray="3 3" />
          </svg>
        </div>

        <!-- 🏆 CENTER PODIUM (Final & 3rd Place) -->
        <div style="width: 250px; height: 1380px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; flex-shrink: 0; box-sizing: border-box;">
          <!-- Trophy Icon & Badge -->
          <div style="text-align: center;">
            <div style="width: 52px; height: 52px; margin: 0 auto; border-radius: 16px; background: linear-gradient(135deg, #d97706, #fbbf24, #b45309); display: flex; align-items: center; justify-content: center; font-size: 28px; box-shadow: 0 0 24px rgba(245, 158, 11, 0.45);">
              🏆
            </div>
            <div style="font-size: 13px; font-weight: 900; color: #fde68a; margin-top: 6px;">
              المباراة النهائية الكبرى 🏆
            </div>
            <div style="font-size: 8.5px; color: #94a3b8; font-family: monospace;">
              بطل دوري جامعة النيل 2026
            </div>
          </div>

          <!-- Grand Final Card -->
          <div style="display: flex; justify-content: center; width: 100%;">
            ${renderVisualCardHtml(grandFinal, true, 246)}
          </div>

          <!-- Third Place Match -->
          <div style="width: 100%; border-top: 1px dashed #334155; padding-top: 12px; text-align: center;">
            <div style="font-size: 10.5px; font-weight: 900; color: #fbbf24; margin-bottom: 5px;">
              🥉 مباراة تحديد المركز الثالث
            </div>
            <div style="display: flex; justify-content: center;">
              ${renderVisualCardHtml(thirdPlace, false, 224)}
            </div>
          </div>

          <!-- Champion Spotlight if finished -->
          ${championName ? `
            <div style="width: 100%; background: linear-gradient(135deg, rgba(180,83,9,0.4), rgba(15,23,42,0.9)); border: 1.5px solid #f59e0b; border-radius: 10px; padding: 8px 12px; text-align: center;">
              <div style="font-size: 9.5px; color: #fde68a; font-weight: 800;">🥇 البطل المتوج:</div>
              <div style="font-size: 14px; color: #ffffff; font-weight: 900;">${championName}</div>
              ${runnerUpName ? `<div style="font-size: 9px; color: #94a3b8; margin-top: 2px;">🥈 الوصيف: ${runnerUpName}</div>` : ''}
            </div>
          ` : `
            <div style="background-color: rgba(15, 23, 42, 0.7); border: 1px solid #1e293b; border-radius: 8px; padding: 6px 12px; text-align: center;">
              <span style="font-size: 8.5px; color: #94a3b8; font-weight: bold;">
                منصة تتويج بطل الدوري 2026 👑
              </span>
            </div>
          `}
        </div>

        <!-- Connecting Line Final to SF2 -->
        <div style="width: 26px; height: 100%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          <svg style="width: 100%; height: 20px;" viewBox="0 0 26 20" fill="none">
            <path d="M 0 10 H 26" stroke="#f59e0b" stroke-width="2.5" stroke-dasharray="3 3" />
          </svg>
        </div>

        <!-- ➡️ RIGHT HALF (1 SF2 <- 2 QF <- 4 R16 <- 8 R32 <- 16 Teams) -->
        ${rightHalfHtml}
      </div>

      <!-- BOTTOM FOOTER -->
      <div style="border-top: 1px solid #1e293b; padding-top: 8px; display: flex; justify-content: space-between; align-items: center; font-size: 9.5px; color: #64748b;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="color: #94a3b8; font-weight: 800;">دوري جامعة النيل لكرة القدم</span>
          <span>•</span>
          <span>اللجنة العليا لتنظيم البطولة والأنشطة الرياضية © ${new Date().getFullYear()}</span>
          <span>•</span>
          <span style="color: #10b981; font-weight: 700;">الشجرة الإقصائية الرسمية المعتمدة</span>
        </div>

        <div style="display: flex; align-items: center; gap: 14px;">
          <span>تم التوليد والحفظ إلكترونياً من منصة البطولة الرسمية</span>
          <span style="background-color: #1e293b; padding: 2px 8px; border-radius: 6px; font-weight: 800; color: #fbbf24; border: 1px solid #334155;">
            صفحة 1 من 2 (الشجرة المرئية)
          </span>
        </div>
      </div>
    `;

    tempContainer.appendChild(page1);

    const canvas1 = await html2canvas(page1, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#080d1a',
    });

    const img1 = canvas1.toDataURL('image/jpeg', 0.96);
    pdf.addImage(img1, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    tempContainer.removeChild(page1);

    // =========================================================================
    // PAGE 2: OFFICIAL KNOCKOUT MATCHES SCHEDULE & REGULATIONS (LANDSCAPE A4)
    // =========================================================================
    onProgress?.('جارٍ بناء الصفحة 2: جدول المواعيد واللوائح والاعتماد...');

    const page2 = document.createElement('div');
    page2.style.width = '2200px';
    page2.style.height = '1555px';
    page2.style.padding = '28px 36px';
    page2.style.boxSizing = 'border-box';
    page2.style.backgroundColor = '#ffffff';
    page2.style.color = '#0f172a';
    page2.style.fontFamily = "'Tajawal', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
    page2.style.display = 'flex';
    page2.style.flexDirection = 'column';
    page2.style.justifyContent = 'space-between';
    page2.dir = 'rtl';

    // Collect all matches
    const allR32Matches = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map(i => getMatchInfo(`r32_${i}`, `دور 32 (مباراة ${i})`));
    const allR16Matches = [1, 2, 3, 4, 5, 6, 7, 8].map(i => getMatchInfo(`r16_${i}`, `دور 16 (مباراة ${i})`));
    const allQFMatches = [1, 2, 3, 4].map(i => getMatchInfo(`qf${i}`, `ربع النهائي (${i})`));
    const allSFMatches = [1, 2].map(i => getMatchInfo(`sf${i}`, `نصف النهائي (${i})`));

    const renderTableRow = (m: ReturnType<typeof getMatchInfo>, idx: number) => `
      <tr style="background-color: ${idx % 2 === 0 ? '#f8fafc' : '#ffffff'}; border-bottom: 1px solid #e2e8f0; font-size: 10px;">
        <td style="padding: 4px 6px; font-weight: 800; color: #475569; text-align: center;">${idx + 1}</td>
        <td style="padding: 4px 6px; font-weight: 800; color: #0284c7;">${m.stageName}</td>
        <td style="padding: 4px 6px; font-weight: ${m.winnerA ? '900' : '700'}; color: ${m.winnerA ? '#047857' : '#0f172a'};">
          ${m.winnerA ? '👑 ' : ''}${m.teamA} ${m.seedA ? `<span style="font-size: 8px; color: #92400e; background: #fef3c7; padding: 1px 4px; border-radius: 3px;">${m.seedA}</span>` : ''}
        </td>
        <td style="padding: 4px 6px; font-family: monospace; font-weight: 900; text-align: center; color: #0f172a; background: #f1f5f9; border-radius: 4px;">
          ${m.scoreA} : ${m.scoreB}
        </td>
        <td style="padding: 4px 6px; font-weight: ${m.winnerB ? '900' : '700'}; color: ${m.winnerB ? '#047857' : '#0f172a'};">
          ${m.winnerB ? '👑 ' : ''}${m.teamB} ${m.seedB ? `<span style="font-size: 8px; color: #92400e; background: #fef3c7; padding: 1px 4px; border-radius: 3px;">${m.seedB}</span>` : ''}
        </td>
        <td style="padding: 4px 6px; font-family: monospace; text-align: center; color: #475569;">
          ${m.date || 'بانتظار الموعد'}
        </td>
        <td style="padding: 4px 6px; font-family: monospace; text-align: center; color: #475569;">
          ${m.time || '-'}
        </td>
        <td style="padding: 4px 6px; text-align: center; font-weight: 700; color: #0284c7;">
          ${m.pitch || '-'}
        </td>
        <td style="padding: 4px 6px; text-align: center;">
          <span style="font-size: 8.5px; font-weight: 800; padding: 2px 6px; border-radius: 9999px; ${
            m.isFinished ? 'background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0;' :
            m.isScheduled ? 'background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe;' :
            'background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0;'
          }">
            ${m.isFinished ? 'انتهت FT' : m.isScheduled ? 'مجدولة' : 'غير محددة'}
          </span>
        </td>
      </tr>
    `;

    page2.innerHTML = `
      <!-- TOP BANNER (Page 2) -->
      <div style="border-bottom: 3px solid #059669; padding-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <div style="width: 52px; height: 52px; border-radius: 14px; background: linear-gradient(135deg, #059669, #047857); display: flex; align-items: center; justify-content: center; font-size: 26px; color: #fff; box-shadow: 0 4px 10px rgba(5,150,105,0.3); flex-shrink: 0;">
            📋
          </div>
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="background-color: #ecfdf5; color: #047857; font-size: 11px; font-weight: 800; padding: 2px 10px; border-radius: 9999px; border: 1px solid #a7f3d0;">
                السجل التفصيلي لمباريات الأدوار الإقصائية واللوائح الرسمية
              </span>
              <span style="color: #64748b; font-size: 11px; font-weight: 700;">
                العام الأكاديمي: ${academicYear}
              </span>
            </div>
            <h1 style="font-size: 22px; font-weight: 900; color: #0f172a; margin: 3px 0 0 0;">
              دوري جامعة النيل — جدول ومواعيد المباريات الإقصائية واللوائح المعتمدة
            </h1>
            <p style="font-size: 11px; color: #475569; margin: 2px 0 0 0;">
              الموسم: ${seasonName} • جدول كافة مواجهات دور الـ 32، ثمن النهائي، ربع النهائي، نصف النهائي، والنهائي
            </p>
          </div>
        </div>

        <div style="text-align: left; background-color: #f8fafc; padding: 6px 14px; border-radius: 10px; border: 1px solid #e2e8f0;">
          <div style="font-size: 9px; color: #64748b; font-weight: 700;">تاريخ وتوقيت الإصدار:</div>
          <div style="font-size: 11px; font-weight: 900; color: #0f172a; font-family: monospace; direction: ltr; text-align: right;">
            ${formattedDate} • ${formattedTime}
          </div>
          <div style="font-size: 9px; color: #059669; font-weight: 800; margin-top: 1px;">
            معتمد رسمياً من اللجنة المنظمة ✓
          </div>
        </div>
      </div>

      <!-- MAIN CONTENT: 2 Balanced Columns -->
      <div style="display: grid; grid-template-columns: 1.35fr 1fr; gap: 20px; margin-top: 14px; flex-grow: 1;">
        <!-- Left Table: All Matches -->
        <div style="background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column;">
          <div style="background-color: #0f172a; color: #ffffff; padding: 8px 14px; font-size: 12px; font-weight: 900; display: flex; justify-content: space-between; align-items: center;">
            <span>جدول مباريات الأدوار الإقصائية (دور الـ 32 حتى النهائي)</span>
            <span style="font-size: 10px; color: #94a3b8; font-weight: normal;">32 مباراة إقصائية</span>
          </div>

          <div style="overflow-y: auto; flex-grow: 1;">
            <table style="width: 100%; border-collapse: collapse; text-align: right;">
              <thead>
                <tr style="background-color: #f1f5f9; color: #334155; font-size: 9.5px; font-weight: 900; border-bottom: 2px solid #cbd5e1;">
                  <th style="padding: 6px; text-align: center; width: 30px;">#</th>
                  <th style="padding: 6px;">المرحلة</th>
                  <th style="padding: 6px;">الفريق الأول</th>
                  <th style="padding: 6px; text-align: center;">النتيجة</th>
                  <th style="padding: 6px;">الفريق الثاني</th>
                  <th style="padding: 6px; text-align: center;">التاريخ</th>
                  <th style="padding: 6px; text-align: center;">التوقيت</th>
                  <th style="padding: 6px; text-align: center;">الملعب</th>
                  <th style="padding: 6px; text-align: center;">الحالة</th>
                </tr>
              </thead>
              <tbody>
                ${allR32Matches.map((m, i) => renderTableRow(m, i)).join('')}
                ${allR16Matches.map((m, i) => renderTableRow(m, 16 + i)).join('')}
                ${allQFMatches.map((m, i) => renderTableRow(m, 24 + i)).join('')}
                ${allSFMatches.map((m, i) => renderTableRow(m, 28 + i)).join('')}
                ${renderTableRow(thirdPlace, 30)}
                ${renderTableRow(grandFinal, 31)}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Right Panels: Regulations, Tie-Breaks, Signatures & Stamp -->
        <div style="display: flex; flex-direction: column; gap: 14px; justify-content: space-between;">
          <!-- Regulations Card -->
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px;">
            <div style="font-size: 12px; font-weight: 900; color: #0f172a; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
              <span>⚖️</span>
              <span>لوائح الحسم وقواعد الأدوار الإقصائية المعتمدة:</span>
            </div>
            <ul style="font-size: 10.5px; color: #334155; line-height: 1.6; margin: 0; padding-right: 18px; space-y: 4px;">
              <li><strong>نظام خروج المغلوب:</strong> تقام جميع المباريات بنظام خروج المغلوب من مباراة واحدة مباشرة.</li>
              <li><strong>التعادل وركلات الترجيح:</strong> في حال انتهاء الوقت الأصلي بالتعادل، يتم اللجوء مباشرة إلى <strong>ركلات الترجيح (5 ركلات لكل فريق)</strong>، ثم ركلة بركلة حتى حسم التأهل.</li>
              <li><strong>فصل المجموعات:</strong> تم توزيع المتأهلين الـ 32 على الشجرة المتناظرة بحيث لا يلتقي أي فريقين من نفس المجموعة نهائياً قبل دور نصف النهائي.</li>
              <li><strong>الانضباط والبطاقات:</strong> يوقف اللاعب لمباراة واحدة عند حصوله على بطاقتين صفراوين، وتُلغى البطاقات الصفراء الفردية بعد انتهاء دور ربع النهائي.</li>
            </ul>
          </div>

          <!-- Podium Status Card -->
          <div style="background: linear-gradient(135deg, #fef3c7, #fef9c3); border: 1.5px solid #f59e0b; border-radius: 12px; padding: 14px;">
            <div style="font-size: 12px; font-weight: 900; color: #78350f; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
              <span>🏆</span>
              <span>حالة التتويج والجوائز الرسمية:</span>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 11px;">
              <div style="background: #ffffff; padding: 8px 10px; border-radius: 8px; border: 1px solid #fde68a;">
                <span style="color: #92400e; font-weight: bold; display: block; font-size: 10px;">🥇 بطل البطولة:</span>
                <strong style="color: #0f172a; font-size: 12px;">${championName || 'يحدد بالمباراة النهائية'}</strong>
              </div>
              <div style="background: #ffffff; padding: 8px 10px; border-radius: 8px; border: 1px solid #fde68a;">
                <span style="color: #92400e; font-weight: bold; display: block; font-size: 10px;">🥈 الوصيف:</span>
                <strong style="color: #0f172a; font-size: 12px;">${runnerUpName || 'يحدد بالمباراة النهائية'}</strong>
              </div>
            </div>
          </div>

          <!-- Signatures & Stamp -->
          <div style="background-color: #f8fafc; border: 1.5px dashed #cbd5e1; border-radius: 12px; padding: 14px;">
            <div style="font-size: 11.5px; font-weight: 900; color: #0f172a; margin-bottom: 12px; text-align: center;">
              اعتماد اللجنة العليا المنظمة لدوري جامعة النيل 2026
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; text-align: center;">
              <div style="background: #ffffff; padding: 8px; border-radius: 8px; border: 1px solid #e2e8f0;">
                <span style="font-size: 9.5px; color: #64748b; font-weight: bold; display: block;">المشرف العام</span>
                <strong style="font-size: 11px; color: #0f172a; display: block; margin: 4px 0;">أ. سمير الحلفاوي</strong>
                <span style="font-size: 8.5px; color: #059669; font-weight: 800;">معتمد إلكترونياً ✓</span>
              </div>
              <div style="background: #ffffff; padding: 8px; border-radius: 8px; border: 1px solid #e2e8f0;">
                <span style="font-size: 9.5px; color: #64748b; font-weight: bold; display: block;">رئيس لجنة المسابقات</span>
                <strong style="font-size: 11px; color: #0f172a; display: block; margin: 4px 0;">لجنة التحكيم والمسابقات</strong>
                <span style="font-size: 8.5px; color: #059669; font-weight: 800;">معتمد إلكترونياً ✓</span>
              </div>
              <div style="background: #ffffff; padding: 8px; border-radius: 8px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                <div style="width: 38px; height: 38px; border-radius: 50%; border: 2px dashed #059669; display: flex; align-items: center; justify-content: center; font-size: 18px; color: #059669;">
                  ⚽
                </div>
                <strong style="font-size: 9px; color: #059669; margin-top: 3px;">الختم المعتمد</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- BOTTOM FOOTER (Page 2) -->
      <div style="border-top: 1px solid #e2e8f0; padding-top: 8px; display: flex; justify-content: space-between; align-items: center; font-size: 9.5px; color: #64748b;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="color: #0f172a; font-weight: 800;">دوري جامعة النيل لكرة القدم</span>
          <span>•</span>
          <span>اللجنة العليا لتنظيم البطولة والأنشطة الرياضية © ${new Date().getFullYear()}</span>
        </div>

        <div style="display: flex; align-items: center; gap: 14px;">
          <span>تم التوليد والحفظ إلكترونياً من منصة البطولة</span>
          <span style="background-color: #f1f5f9; padding: 2px 8px; border-radius: 6px; font-weight: 800; color: #0f172a; border: 1px solid #e2e8f0;">
            صفحة 2 من 2 (جدول المواعيد واللوائح)
          </span>
        </div>
      </div>
    `;

    tempContainer.appendChild(page2);

    const canvas2 = await html2canvas(page2, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const img2 = canvas2.toDataURL('image/jpeg', 0.96);
    pdf.addPage('a4', 'landscape');
    pdf.addImage(img2, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    tempContainer.removeChild(page2);

    onProgress?.('جارٍ حفظ وتنزيل وثيقة الأدوار الإقصائية...');
    const filename = `شجرة_الأدوار_الإقصائية_دوري_جامعة_النيل_${new Date().toISOString().substring(0, 10)}.pdf`;
    pdf.save(filename);
  } finally {
    if (document.body.contains(tempContainer)) {
      document.body.removeChild(tempContainer);
    }
  }
}

