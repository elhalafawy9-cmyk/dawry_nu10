import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Team, Match } from '../App';

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

    onProgress?.('جارٍ تنزيل وحفظ ملف الـ PDF...');
    const filename = isAllGroups
      ? `سجل_ترتيب_مجموعات_دوري_جامعة_النيل_${new Date().toISOString().substring(0, 10)}.pdf`
      : `ترتيب_المجموعة_${selectedGroup}_دوري_جامعة_النيل_${new Date().toISOString().substring(0, 10)}.pdf`;

    pdf.save(filename);
  } finally {
    if (document.body.contains(tempContainer)) {
      document.body.removeChild(tempContainer);
    }
  }
}
