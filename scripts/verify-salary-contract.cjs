const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ serviceWorkers: 'block' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://**/*', r => r.abort());
    await page.route('**/supabase-config.js*', r => r.fulfill({ contentType: 'application/javascript', body: 'window.PONTE_SUPABASE_CONFIG = {};' }));
    await page.route('**/app.js*', r => r.fulfill({ contentType: 'application/javascript', body: fs.readFileSync('outputs/finance-pwa/app.js', 'utf8').replace('  initApp();', 'window.testSalary = { openModal, estimateFactorySourceSalary, estimateSalaryDeductions, salaryReceiptTargetFromRef, factoryScheduleDay, contractShiftHours, createInitialState, normalizeState, render, renderIncomeSourceModal, renderWorkOverrideModal, saveIncomeSource, saveWorkOverride, getState: () => state, setState: s => { state = s; } };\n  initApp();') }));
    await page.goto('http://127.0.0.1:4174/app.html');
    const results = await page.evaluate(() => {
      const t = window.testSalary;
      const source = { id: 'test-factory', name: 'Fabrica teste', type: 'factory', currency: 'JPY', bankAccountId: 'salary-bank', salaryCalculationMode: 'contract', salaryHourlyRate: 1600, salaryTeijiHours: 9, salaryFixedOvertimeHours: 2, salaryOvertimeRate: 25, salaryNightRate: 25, salaryHolidayRate: 35, salaryRestRate: 25, salaryOvertimeThreshold: 60, salaryOvertimeHighRate: 50, salaryClosingDay: 31, salaryNightStart: '22:00', salaryNightEnd: '05:00', cycleStartDate: '2026-08-01' };
      const state = t.createInitialState();
      state.bankAccounts = [{ id: 'salary-bank', bankName: 'Yucho', nickname: 'Correio', country: 'japao', currency: 'JPY', active: true }];
      state.incomeSources = [source];
      t.setState(t.normalizeState(state));
      const planned = { ...source, cycleStartDate: '2026-08-30', cycleStartPhase: 'night', hirukinStart: '09:00', hirukinEnd: '21:00', yakinStart: '21:00', yakinEnd: '09:00', salaryNightBreaks: '00:00-00:45, 05:00-05:25' };
      const shifts = Array.from({ length: 31 }, (_, i) => t.factoryScheduleDay(planned, `2026-08-${String(i + 1).padStart(2, '0')}`)).filter(day => ['day', 'night'].includes(day.type));
      // Model an 18-day month with ten night shifts and three legal rest days.
      const chosen = shifts.filter(day => new Date(day.date + 'T12:00:00').getDay() === 0);
      for (const type of ['night', 'day']) {
        for (const day of shifts.filter(day => day.type === type && !chosen.includes(day))) {
          if (chosen.filter(item => item.type === type).length < (type === 'night' ? 10 : 8)) chosen.push(day);
        }
      }
      state.workScheduleOverrides = shifts.filter(day => !chosen.includes(day)).map(day => ({ id: day.date, sourceId: source.id, date: day.date, type: 'manualOff' }));
      t.setState(t.normalizeState(state));
      const beforeWeekly = t.estimateFactorySourceSalary(planned, '2026-08', null);
      const afterWeekly = t.estimateFactorySourceSalary({ ...planned, salaryLegalRestDay: '0' }, '2026-08', null);
      const simple = { ...planned, salaryWeekendRulesVersion: 1, salarySundayLegal: true, salarySundayLegalRate: 35, salarySaturdayLegal: false, salarySaturdayLegalRate: 25, salaryLegalHours: 11, salaryNightMethod: 'fixed', salaryNightMinutesPerShift: 375 };
      const simplified = t.estimateFactorySourceSalary(simple, '2026-08', null);
      const migratedLegalRate = t.estimateFactorySourceSalary({ ...simple, salarySundayLegalRate: 135 }, '2026-08', null);
      const disabledWeekend = t.estimateFactorySourceSalary({ ...simple, salarySundayLegal: false }, '2026-08', null);
      const augustDeductions = t.estimateSalaryDeductions({ salaryDeductionsEnabled: true, salaryStandardRemuneration: 260000, salaryHealthRate: 5.065, salaryPensionRate: 9.15, salaryLongTermCareEnabled: false, salaryLongTermCareRate: .81, salaryEmploymentRate: .5, salaryChildSupportRate: .115, salaryIncomeTaxFixed: 10240, salaryResidentTaxFixed: 0, salaryHousingDeduction: 56200, salaryParkingDeduction: 3300 }, simplified.total);
      const disabledDeductions = t.estimateSalaryDeductions({ salaryDeductionsEnabled: false, salaryStandardRemuneration: 260000 }, simplified.total);
      const make = (month, entries) => {
        state.workScheduleOverrides = Array.from({ length: 31 }, (_, index) => ({ id: 'd' + index, sourceId: source.id, date: `${month}-${String(index + 1).padStart(2, '0')}`, type: 'manualOff', ...entries[index] }));
        t.setState(t.normalizeState(state));
      };
      const rows = Array.from({ length: 18 }, (_, index) => ({ type: index < 15 ? 'regular' : 'holiday', actualRegularHours: index < 15 ? 9 : 11, actualOvertimeHours: index < 15 ? 2 : 0, actualNightHours: index < 10 ? 6.25 : 0 }));
      make('2026-08', rows);
      const august = t.estimateFactorySourceSalary(source, '2026-08', null);
      source.salaryHourlyRate = 1550;
      source.salaryBonuses = [{ name: 'Incentivo', amount: 80000, frequency: 'once', nextPaymentDate: '2026-08-14' }, { name: 'Treinamento', amount: 3300, frequency: 'once', nextPaymentDate: '2026-08-14' }];
      make('2026-07', Array.from({ length: 2 }, () => ({ type: 'regular', actualRegularHours: 9, actualOvertimeHours: 2, actualNightHours: 0 })));
      const july = t.estimateFactorySourceSalary(source, '2026-07', '2026-08');
      const julyDeductions = t.estimateSalaryDeductions({ salaryDeductionsEnabled: true, salaryStandardRemuneration: 260000, salaryHealthRate: 5.065, salaryPensionRate: 9.15, salaryLongTermCareEnabled: false, salaryEmploymentRate: .5, salaryChildSupportRate: .115, salaryIncomeTaxFixed: 0, salaryHousingDeduction: 13113, salaryParkingDeduction: 770 }, july.total);
      const laterBonus = t.estimateFactorySourceSalary(source, '2026-07', '2026-09').bonus;
      const breaks = t.contractShiftHours('20:50-07:00', '00:00-00:45, 05:00-05:25', '22:00', '05:00');
      source.salaryHourlyRate = 1600;
      source.salaryBonuses = [];
      make('2026-08', [{ type: 'paidOff' }, { type: 'regular', actualRegularHours: 5, actualOvertimeHours: 0, actualNightHours: 0 }, { type: 'rest', actualRegularHours: 10, actualOvertimeHours: 0, actualNightHours: 2 }]);
      const mixed = t.estimateFactorySourceSalary(source, '2026-08', null);
      source.salaryOvertimeThreshold = 1;
      make('2026-08', [{ type: 'regular', actualRegularHours: 9, actualOvertimeHours: 2, actualNightHours: 0 }]);
      const tier = t.estimateFactorySourceSalary(source, '2026-08', null);
      source.salaryClosingDay = 20;
      source.salaryStartDate = '2026-08-02';
      const truncated = t.estimateFactorySourceSalary(source, '2026-08', null);
      source.salaryClosingDay = 31;
      source.salaryStartDate = '';
      source.salaryOvertimeThreshold = 60;
      state.ui.selectedMonth = '2026-09';
      make('2026-08', rows);
      t.render();
      return { augustDeductions, disabledDeductions, julyDeductions, simplified: simplified.total, migratedLegalRate: migratedLegalRate.total, simplifiedNight: simplified.nightHours, disabledWeekend: disabledWeekend.total, beforeWeekly: beforeWeekly.total, afterWeekly: afterWeekly.total, august: august.total, components: [august.teiji, august.overtime, august.sunday, august.night], july: july.total, laterBonus, breaks, mixed: mixed.total, tierExtra: tier.overtime, truncated: truncated.total };
    });
    console.log(results);
    assert.equal(results.beforeWeekly, 356200);
    assert.equal(results.afterWeekly, 372280);
    assert.equal(results.simplified, 372280);
    assert.equal(results.migratedLegalRate, 372280);
    assert.equal(results.augustDeductions.total, 108859);
    assert.equal(results.augustDeductions.net, 263421);
    assert.equal(results.disabledDeductions.total, 0);
    assert.equal(results.disabledDeductions.net, 372280);
    assert.equal(results.julyDeductions.total, 51736);
    assert.equal(results.julyDeductions.net, 67214);
    assert.equal(results.simplifiedNight, 62.5);
    assert.equal(results.disabledWeekend, 356200);
    assert.equal(results.august, 372280);
    assert.deepEqual(results.components, [216000, 60000, 71280, 25000]);
    assert.equal(results.july, 118950);
    assert.equal(results.laterBonus, 0);
    assert.equal(results.breaks.night, 6.25);
    assert.equal(results.breaks.paid, 9);
    assert.equal(results.mixed, 43200);
    assert.equal(results.tierExtra, 4400);
    assert.equal(results.truncated, 0);
    await page.evaluate(() => {
      const t = window.testSalary;
      t.openModal('incomeSource', t.getState().incomeSources[0].id);
    });
    await page.locator('.salary-contract-fields summary').click();
    await page.locator('#salaryNightBreaks').fill('00:00-00:45, 05:00-05:25');
    await page.locator('#salarySundayLegal').check();
    await page.locator('#salarySundayLegalRate').fill('135');
    await page.locator('#salaryNightMethod').selectOption('fixed');
    await page.locator('#salaryNightHoursWhole').fill('6');
    await page.locator('#salaryNightMinutes').fill('15');
    await page.locator('#salaryDeductionsEnabled').check();
    await page.locator('#salaryStandardRemuneration').fill('260000');
    await page.locator('#salaryIncomeTaxFixed').fill('10240');
    await page.locator('#salaryHousingDeduction').fill('56200');
    await page.locator('#salaryParkingDeduction').fill('3300');
    await page.locator('form[data-form="income-source"] button[type="submit"]').click();
    assert.equal(await page.evaluate(() => window.testSalary.getState().incomeSources[0].salaryNightBreaks), '00:00-00:45, 05:00-05:25');
    assert.equal(await page.evaluate(() => window.testSalary.getState().incomeSources[0].salaryHolidayRate), 35);
    assert.equal(await page.evaluate(() => window.testSalary.getState().incomeSources[0].salarySundayLegal), true);
    assert.equal(await page.evaluate(() => window.testSalary.getState().incomeSources[0].salaryNightMinutesPerShift), 375);
    assert.equal(await page.evaluate(() => window.testSalary.getState().incomeSources[0].salaryStandardRemuneration), 260000);
    await page.evaluate(() => {
      const state = window.testSalary.getState();
      state.housingCards = [{
        id: 'housing-company', name: 'Apartamento da empresa', country: 'japao', currency: 'JPY', active: true,
        items: [
          { key: 'rent', label: 'Aluguel', active: true, amount: 56200, currency: 'JPY', paymentMethod: 'company', companyId: 'test-factory' },
          { key: 'parking', label: 'Estacionamento', active: true, amount: 3300, currency: 'JPY', paymentMethod: 'company', companyId: 'test-factory' }
        ]
      }];
    });
    const receipt = await page.evaluate(() => window.testSalary.salaryReceiptTargetFromRef('factory:test-factory:2026-08:2026-09'));
    assert.equal(receipt.grossAmount, 372280);
    assert.equal(receipt.deductions, 108859);
    assert.equal(receipt.amount, 372280);
    assert.equal(receipt.netAmount, 263421);
    await page.evaluate(() => window.testSalary.openModal('salaryReceipt', 'factory:test-factory:2026-08:2026-09'));
    await page.locator('form[data-form="salary-receipt"] button[type="submit"]').click();
    const payroll = await page.evaluate(() => {
      const state = window.testSalary.getState();
      return {
        gross: state.transactions.find(item => item.type === 'income' && item.paymentRef == null)?.amount,
        deductions: state.transactions.filter(item => item.payrollKey).reduce((sum, item) => sum + item.amount, 0),
        rentPaid: Boolean(state.paidCommitments['2026-09:housing:housing-company:rent']),
        parkingPaid: Boolean(state.paidCommitments['2026-09:housing:housing-company:parking'])
      };
    });
    assert.equal(payroll.gross, 372280);
    assert.equal(payroll.deductions, 108859);
    assert.equal(payroll.rentPaid, true);
    assert.equal(payroll.parkingPaid, true);
    await page.evaluate(() => {
      window.testSalary.openModal('workOverride');
    });
    await page.locator('#overrideType').selectOption('regular');
    await page.locator('#overrideDate').fill('2026-09-14');
    await page.locator('#actualRegularHours').fill('8');
    await page.locator('#actualOvertimeHours').fill('1');
    await page.locator('#actualNightHours').fill('5.5');
    await page.locator('form[data-form="work-override"] button[type="submit"]').click();
    assert.equal(await page.evaluate(() => window.testSalary.getState().workScheduleOverrides.find(item => item.date === '2026-09-14').actualNightHours), 5.5);
    await page.evaluate(() => {
      const t = window.testSalary;
      t.openModal('incomeSource', t.getState().incomeSources[0].id);
    });
    for (const width of [390, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await page.locator('#salaryFixedOvertimeHours').scrollIntoViewIfNeeded();
      await page.screenshot({ path: `work/salary-contract-${width}.png`, fullPage: true });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await page.evaluate(() => window.testSalary.openModal('housingCard', 'housing-company'));
    assert.equal(await page.locator('#parkingPaymentMethod option[value="company"]').textContent(), 'Desconto pela empresa');
    assert.equal(await page.locator('#rentCompanyId').inputValue(), 'test-factory');
    assert.equal(await page.locator('.housing-company-field:not(.is-hidden)').count(), 2);
    await page.screenshot({ path: 'work/housing-company-390.png', fullPage: true });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert.deepEqual(errors, []);
    console.log('PASS: both payslips, breaks, paid leave, rest days, overtime tiers, closing/start dates, form persistence and layouts.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
