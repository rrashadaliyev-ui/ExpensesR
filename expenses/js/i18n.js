/*
 * LANGUAGES (English / Azərbaycan dili)
 * -------------------------------------
 * The interface is written in English. When Azerbaijani is selected, every text that appears
 * on screen is translated automatically using the dictionary below (exact phrases) and the
 * PATTERNS list (phrases that contain numbers, amounts or dates).
 *
 * To translate a new piece of text: add  'English text': 'Azərbaycan mətni'  to AZ.
 * Untranslated text simply stays in English, so nothing ever breaks.
 *
 * Language choice is remembered on this device (localStorage) and in your settings (synced).
 */
(function () {
  'use strict';
  window.App = window.App || {};

  const I = { lang: 'en', hasLocal: false };
  try { const l = localStorage.getItem('em-lang'); if (l) { I.lang = l; I.hasLocal = true; } } catch (e) { /* storage blocked */ }
  I.locale = () => (I.lang === 'az' ? 'az-Latn-AZ' : undefined);
  I.set = function (lang) {
    try { localStorage.setItem('em-lang', lang); } catch (e) { /* ignore */ }
    if (App.data && App.data.settings && App.data.settings.lang !== lang && App.data.categories) {
      App.data.saveSettings({ lang }).catch(() => {}).finally(() => location.reload());
    } else location.reload();
  };

  const AZ = {
    // App shell & navigation
    'Expense Manager': 'Xərc İdarəçisi', 'Dashboard': 'İdarə paneli', 'Expenses': 'Xərclər', 'Budget & Savings': 'Büdcə və qənaət',
    'Breakdown': 'Təhlil', 'Reports': 'Hesabatlar', 'Categories': 'Kateqoriyalar', 'Settings & data': 'Ayarlar və məlumatlar', 'Settings': 'Ayarlar',
    '+ Add expense': '+ Xərc əlavə et', '+ Add': '+ Əlavə et', 'Tip: press': 'Məsləhət: xərc əlavə etmək üçün', 'to add an expense': 'düyməsini basın',
    'Loading…': 'Yüklənir…', 'Skip to content': 'Məzmuna keç', 'Open menu': 'Menyunu aç', 'Toggle dark mode': 'Tünd rejimi dəyiş',
    'Switch to light mode': 'Açıq rejimə keç', 'Switch to dark mode': 'Tünd rejimə keç',
    // Sign-in
    'Sign in with Google': 'Google ilə daxil ol',
    'Sign in with your Google account. Your expenses are saved in your account and synced across your phone and computer.': 'Google hesabınızla daxil olun. Xərcləriniz hesabınızda saxlanılır, telefon və kompüter arasında sinxronlaşır.',
    'Could not connect to the cloud': 'Buluda qoşulmaq mümkün olmadı', 'Try again': 'Yenidən cəhd et',
    // Common
    'Cancel': 'Ləğv et', 'Save': 'Yadda saxla', 'Delete': 'Sil', 'Edit': 'Redaktə et', 'Close': 'Bağla', 'Create': 'Yarat', 'OK': 'OK', 'Restore': 'Bərpa et',
    'Clear': 'Təmizlə', 'Now': 'İndi', 'to': '—', 'Total': 'Cəmi', 'total': 'cəmi', 'All': 'Hamısı', 'Date': 'Tarix', 'Title': 'Ad', 'Amount': 'Məbləğ',
    'Category': 'Kateqoriya', 'Subcategory': 'Alt kateqoriya', 'Payment': 'Ödəniş', 'Period': 'Dövr', 'Month': 'Ay', 'Average': 'Orta', 'Details': 'Təfərrüatlar',
    'No data': 'Məlumat yoxdur', 'deleted': 'silinib', 'new': 'yeni', 'Are you sure?': 'Əminsiniz?', 'Actions': 'Əməliyyatlar', 'Saved': 'Yadda saxlanıldı',
    'Deleted': 'Silindi', 'Previous period': 'Əvvəlki dövr', 'Next period': 'Növbəti dövr', 'Previous month': 'Əvvəlki ay', 'Next month': 'Növbəti ay',
    'Time period': 'Dövr', 'From date': 'Başlanğıc tarixi', 'To date': 'Son tarix',
    // Periods
    'Daily': 'Günlük', 'Weekly': 'Həftəlik', 'Monthly': 'Aylıq', 'Yearly': 'İllik', 'Custom range': 'Seçilmiş aralıq', 'All time': 'Bütün dövr',
    'Today': 'Bu gün', 'Yesterday': 'Dünən', 'This week': 'Bu həftə', 'This month': 'Bu ay', '2 days ago': '2 gün əvvəl',
    'per day': 'gündəlik', 'per week': 'həftəlik', 'per month': 'aylıq', 'per year': 'illik',
    // Payment methods
    'Cash': 'Nağd', 'Card': 'Kart', 'Bank Transfer': 'Bank köçürməsi', 'Other': 'Digər', 'All methods': 'Bütün üsullar', 'Payment method': 'Ödəniş üsulu',
    // Dashboard
    'Overview of your spending': 'Xərclərinizin icmalı', 'Total expenses (all time)': 'Ümumi xərclər (bütün dövr)', 'Analysis period': 'Təhlil dövrü',
    'Total in period': 'Dövr üzrə cəmi', 'Daily average': 'Gündəlik orta', 'Most expensive category': 'Ən çox xərclənən kateqoriya',
    'Most expensive subcategory': 'Ən çox xərclənən alt kateqoriya', 'By category': 'Kateqoriyalar üzrə', 'Details →': 'Ətraflı →',
    'Top subcategories': 'Ən böyük alt kateqoriyalar', 'Spending trend': 'Xərc dinamikası', 'Recent transactions': 'Son əməliyyatlar', 'View all →': 'Hamısına bax →',
    'No expenses yet.': 'Hələ xərc yoxdur.', 'Add your first expense': 'İlk xərcinizi əlavə edin', 'or load sample data in': 'və ya nümunə məlumatları',
    'to explore.': 'bölməsindən yükləyin.', 'No expenses in this period.': 'Bu dövrdə xərc yoxdur.', 'Compared with the previous period': 'Əvvəlki dövrlə müqayisədə',
    'Monthly budget': 'Aylıq büdcə', 'No budget set for this month.': 'Bu ay üçün büdcə təyin edilməyib.', 'Set your monthly budget →': 'Aylıq büdcənizi təyin edin →',
    // Expenses page
    'Search, filter, edit and manage every transaction': 'Bütün əməliyyatları axtarın, süzün, redaktə edin və idarə edin', 'Export CSV': 'CSV ixrac et',
    'Search': 'Axtarış', 'Title, description or notes…': 'Ad, təsvir və ya qeydlər…', 'Reset filters': 'Filtrləri sıfırla', 'Change category': 'Kateqoriyanı dəyiş',
    'Export selected': 'Seçilənləri ixrac et', 'Delete selected': 'Seçilənləri sil', 'All categories': 'Bütün kateqoriyalar', 'All subcategories': 'Bütün alt kateqoriyalar',
    'Only expenses without subcategory': 'Yalnız alt kateqoriyasız xərclər', 'No expenses match these filters.': 'Bu filtrlərə uyğun xərc yoxdur.',
    'expenses · Total': 'xərc · Cəmi', 'expense · Total': 'xərc · Cəmi', 'selected ·': 'seçilib ·', 'Select all shown': 'Göstərilənlərin hamısını seç', 'Select': 'Seç',
    'Expense deleted': 'Xərc silindi', 'Expense updated': 'Xərc yeniləndi', 'Delete expense?': 'Xərc silinsin?', 'Move': 'Köçür',
    // Expense form & details
    'Add expense': 'Xərc əlavə et', 'Edit expense': 'Xərci redaktə et', 'Title / description': 'Ad / təsvir', 'e.g. Weekly groceries': 'məs. Həftəlik ərzaq',
    'Notes': 'Qeydlər', '(optional)': '(istəyə bağlı)', 'Choose category…': 'Kateqoriya seçin…', '— None (directly in category) —': '— Yoxdur (birbaşa kateqoriyada) —',
    '— None —': '— Yoxdur —', 'Save & add another': 'Yadda saxla və yenisini əlavə et', 'Save expense': 'Xərci yadda saxla', 'Save changes': 'Dəyişiklikləri yadda saxla',
    'Created': 'Yaradılıb', 'Last updated': 'Son dəyişiklik',
    'Title is required.': 'Ad mütləqdir.', 'Amount is required.': 'Məbləğ mütləqdir.', 'Amount must be greater than zero.': 'Məbləğ sıfırdan böyük olmalıdır.',
    'Use at most 2 decimal places.': 'Ən çox 2 onluq rəqəm yazın.', 'Enter a valid number, e.g. 12.50': 'Düzgün rəqəm daxil edin, məs. 12.50',
    'Amount is too large.': 'Məbləğ çox böyükdür.', 'Please choose a category.': 'Zəhmət olmasa kateqoriya seçin.', 'Please choose a valid date.': 'Zəhmət olmasa düzgün tarix seçin.',
    'Subcategory does not belong to the selected category.': 'Alt kateqoriya seçilmiş kateqoriyaya aid deyil.', 'Name is required.': 'Ad mütləqdir.',
    // Categories
    'Organise categories and subcategories. Totals respect the selected period.': 'Kateqoriya və alt kateqoriyaları idarə edin. Cəmlər seçilmiş dövrə görədir.',
    '+ New category': '+ Yeni kateqoriya', 'Totals for': 'Dövr', 'Period total:': 'Dövr üzrə cəmi:', '+ Subcategory': '+ Alt kateqoriya', '+ Expense': '+ Xərc',
    'No subcategory (direct)': 'Alt kateqoriyasız (birbaşa)', 'deleted – kept for history': 'silinib – tarixçə üçün saxlanılır', 'No categories yet.': 'Hələ kateqoriya yoxdur.',
    'Create your first category': 'İlk kateqoriyanızı yaradın', 'New category': 'Yeni kateqoriya', 'Edit category': 'Kateqoriyanı redaktə et',
    'New subcategory': 'Yeni alt kateqoriya', 'Edit subcategory': 'Alt kateqoriyanı redaktə et', 'Category name': 'Kateqoriya adı', 'Subcategory name': 'Alt kateqoriya adı',
    'Colour': 'Rəng', 'Icon': 'İkon', 'Preview:': 'Önizləmə:', 'Subcategory of': 'Ana kateqoriya:', 'Custom colour': 'Öz rənginiz',
    'Renaming updates every past expense automatically – history is linked by ID, never by name.': 'Adı dəyişmək bütün keçmiş xərcləri avtomatik yeniləyir – tarixçə adla deyil, ID ilə bağlıdır.',
    'Category created': 'Kateqoriya yaradıldı', 'Subcategory created': 'Alt kateqoriya yaradıldı', 'Category restored': 'Kateqoriya bərpa edildi',
    'Delete category': 'Kateqoriyanı sil', 'Delete subcategory': 'Alt kateqoriyanı sil', 'Delete category?': 'Kateqoriya silinsin?', 'Delete subcategory?': 'Alt kateqoriya silinsin?',
    'Keep history (recommended)': 'Tarixçəni saxla (tövsiyə olunur)', 'Move expenses, then delete': 'Xərcləri köçür, sonra sil',
    'Rename': 'Adını dəyiş', 'Add expense here': 'Bura xərc əlavə et',
    'Target category': 'Hədəf kateqoriya', 'Target subcategory': 'Hədəf alt kateqoriya',
    // Budget & savings
    'Set a monthly budget, see what is left, and track how much you save.': 'Aylıq büdcə təyin edin, nə qaldığını görün və nə qədər qənaət etdiyinizi izləyin.',
    'Set monthly budget': 'Aylıq büdcəni təyin et', 'Edit budget': 'Büdcəni redaktə et', 'Budget': 'Büdcə', '(every month)': '(hər ay)', 'Spent': 'Xərclənib',
    'Left': 'Qalıb', 'Over budget': 'Büdcədən artıq', 'You can spend': 'Gündə', 'Saved this month': 'Bu ay qənaət edildi', 'Overspent this month': 'Bu ay büdcə aşıldı',
    'Where the money went': 'Pul hara xərcləndi', '% = share of the monthly budget': '% = aylıq büdcədəki pay', 'Spent so far:': 'İndiyədək xərclənib:',
    'Set budget': 'Büdcə təyin et', 'Savings': 'Qənaət', 'Total saved': 'Ümumi qənaət', 'This month so far': 'Bu ay indiyədək',
    'Saved = budget − spent, for every month that has a budget. Overspending counts as negative.': 'Qənaət = büdcə − xərc (büdcəsi olan hər ay üçün). Büdcəni aşmaq mənfi sayılır.',
    'left if you spend nothing more': 'daha xərcləməsəniz qalacaq', 'Total incl. this month': 'Bu ay daxil cəmi', 'in progress': 'davam edir',
    'Total (finished months)': 'Cəmi (bitmiş aylar)', 'Set a monthly budget to start tracking savings.': 'Qənaəti izləmək üçün aylıq büdcə təyin edin.',
    'Use this budget for this month and all future months. Earlier months keep their old budget.': 'Bu büdcə bu ay və gələcək aylar üçün tətbiq olunur. Əvvəlki aylar köhnə büdcəni saxlayır.',
    'A different budget just for this one month.': 'Yalnız bu ay üçün fərqli büdcə.', 'Leave the amount empty to remove the budget.': 'Büdcəni silmək üçün məbləği boş qoyun.',
    'Save budget': 'Büdcəni yadda saxla', 'Budget saved': 'Büdcə yadda saxlanıldı', 'e.g. 1500': 'məs. 1500', 'Saved:': 'Qənaət:',
    // Borrowed & lent
    'Borrowed & Lent': 'Borclar', 'Keep track of money you lent to others and money you borrowed.': 'Başqalarına verdiyiniz və özünüzün aldığınız borcları izləyin.',
    '+ I borrowed': '+ Borc aldım', '+ I lent': '+ Borc verdim', 'Owed to you': 'Sizə borcludurlar', 'You owe': 'Siz borclusunuz', 'Balance': 'Balans',
    'you owe more than you are owed': 'borcunuz alacağınızdan çoxdur', 'you are owed more than you owe': 'alacağınız borcunuzdan çoxdur',
    'Open': 'Açıq', 'Repaid': 'Qaytarılıb', 'Money you lent': 'Verdiyiniz borclar', 'They owe you': 'Sizə qaytarmalıdırlar',
    'Money you borrowed': 'Aldığınız borclar', 'You owe them': 'Siz qaytarmalısınız', 'Nothing here.': 'Burada heç nə yoxdur.', '+ Repayment': '+ Qaytarma',
    'Delete record?': 'Qeyd silinsin?', 'Remove repayment?': 'Qaytarma silinsin?', 'Remove repayment': 'Qaytarmanı sil', 'Removed': 'Silindi',
    'I lent money': 'Borc verdim', 'I borrowed money': 'Borc aldım', 'Person': 'Şəxs', 'e.g. Elvin': 'məs. Elvin', 'Due date': 'Qaytarma tarixi', 'Note': 'Qeyd',
    'Edit record': 'Qeydi redaktə et', 'New record': 'Yeni qeyd', 'Amount repaid': 'Qaytarılan məbləğ', 'Add repayment': 'Qaytarma əlavə et',
    'Enter part of the amount for a partial repayment.': 'Qismən qaytarma üçün məbləğin bir hissəsini yazın.', 'Fully repaid 🎉': 'Tam qaytarıldı 🎉',
    'Repayment saved': 'Qaytarma yadda saxlanıldı', 'left': 'qalıb', 'Please enter a name.': 'Zəhmət olmasa ad yazın.',
    'Amount cannot be less than what was already repaid.': 'Məbləğ artıq qaytarılandan az ola bilməz.', 'Please choose a valid due date.': 'Zəhmət olmasa düzgün qaytarma tarixi seçin.',
    'Name is too long (max 60 characters).': 'Ad çox uzundur (maks. 60 simvol).', 'Record not found.': 'Qeyd tapılmadı.',
    'No open loans.': 'Açıq borc yoxdur.', 'Record money you lent or borrowed →': 'Verdiyiniz və ya aldığınız borcu qeyd edin →',
    // Quick add, undo, phone tab bar
    'Quick add': 'Tez əlavə', 'Remove from favourites': 'Seçilmişlərdən sil', 'Removed from favourites': 'Seçilmişlərdən silindi',
    '⭐ Tip: tick “Also save as a quick-add favourite” when adding an expense to get one-tap buttons here.': '⭐ Məsləhət: xərc əlavə edərkən “Həm də tez əlavə üçün seçilmişlərə saxla” seçin – burada bir toxunuşla əlavə düymələri görünəcək.',
    '⭐ Also save as a quick-add favourite': '⭐ Həm də tez əlavə üçün seçilmişlərə saxla', '⭐ Add to favourites': '⭐ Seçilmişlərə əlavə et',
    'Added to favourites': 'Seçilmişlərə əlavə edildi', 'Already in favourites': 'Artıq seçilmişlərdədir', 'Favourite not found.': 'Seçilmiş tapılmadı.',
    'You can have up to 12 favourites. Remove one first.': 'Ən çox 12 seçilmiş ola bilər. Əvvəlcə birini silin.',
    'Undo': 'Geri qaytar', 'Restored': 'Bərpa edildi', 'More': 'Daha çox', 'Quick navigation': 'Sürətli keçid',
    // Breakdown
    'Each level has its own period filter, so you can compare different time ranges side by side.': 'Hər səviyyənin öz dövr filtri var – fərqli dövrləri yan-yana müqayisə edə bilərsiniz.',
    'Use Level 1 period for all': '1-ci səviyyənin dövrünü hamısına tətbiq et', 'Copy the Level 1 period to Level 2 and 3': '1-ci səviyyənin dövrünü 2 və 3-cü səviyyəyə köçür',
    'Total expenses': 'Ümumi xərclər', 'Sum of every expense in the selected period.': 'Seçilmiş dövrdəki bütün xərclərin cəmi.', 'Number of expenses': 'Xərclərin sayı',
    'Largest expense': 'Ən böyük xərc', 'Category expenses': 'Kateqoriya xərcləri', 'Total per category and its share of all spending in the period.': 'Hər kateqoriyanın cəmi və dövrdəki ümumi xərclərdə payı.',
    'Compare:': 'Müqayisə:', '% of total': 'Cəmdə %', 'Selected categories': 'Seçilmiş kateqoriyalar', 'Subcategory expenses': 'Alt kateqoriya xərcləri',
    'Each subcategory under its parent. Category total = its subcategories + direct expenses (never double-counted).': 'Hər alt kateqoriya öz ana kateqoriyasının altında. Kateqoriya cəmi = alt kateqoriyalar + birbaşa xərclər (heç vaxt iki dəfə sayılmır).',
    'Category:': 'Kateqoriya:', 'Category / subcategory': 'Kateqoriya / alt kateqoriya', '% of category': 'Kateqoriyada %',
    // Reports
    'Analyse spending over time and export the results': 'Xərcləri zaman üzrə təhlil edin və nəticələri ixrac edin', 'Print / PDF': 'Çap / PDF',
    'By subcategory': 'Alt kateqoriyalar üzrə', 'Trends & comparison': 'Dinamika və müqayisə', 'Daily report': 'Günlük hesabat', 'Weekly report': 'Həftəlik hesabat',
    'Monthly report': 'Aylıq hesabat', 'By category report': 'Kateqoriyalar üzrə hesabat', 'By subcategory report': 'Alt kateqoriyalar üzrə hesabat',
    'Trends & comparison report': 'Dinamika və müqayisə hesabatı', 'Hide periods with no expenses': 'Xərc olmayan dövrləri gizlət', 'Week starting': 'Həftənin başlanğıcı',
    'Change vs previous': 'Əvvəlkinə görə dəyişiklik', 'Change': 'Dəyişiklik', 'Change %': 'Dəyişiklik %', 'Month-to-month comparison': 'Aylar üzrə müqayisə',
    'Highest spending days': 'Ən çox xərc edilən günlər', 'Highest spending weeks': 'Ən çox xərc edilən həftələr', 'Highest spending months': 'Ən çox xərc edilən aylar',
    'Category comparison by month': 'Aylar üzrə kateqoriya müqayisəsi', 'No expenses match this filter.': 'Bu filtrə uyğun xərc yoxdur.', 'Expenses (count)': 'Xərclər (say)',
    // Settings
    'Preferences, backup, restore and import': 'Seçimlər, ehtiyat nüsxə, bərpa və idxal', 'Preferences': 'Seçimlər', 'Theme': 'Mövzu', 'Follow system': 'Sistemə uyğun',
    'Light': 'Açıq', 'Dark': 'Tünd', 'Currency': 'Valyuta', 'Week starts on': 'Həftə başlayır', 'Monday': 'Bazar ertəsi', 'Sunday': 'Bazar', 'Language': 'Dil',
    'Changing currency only changes the symbol shown – amounts are not converted.': 'Valyutanı dəyişmək yalnız göstərilən işarəni dəyişir – məbləğlər çevrilmir.',
    'Cloud account': 'Bulud hesabı', 'Signed in as': 'Daxil olmusunuz:', 'Sync now': 'İndi sinxronlaşdır', 'Sign out': 'Çıxış', 'Cloud sync': 'Bulud sinxronizasiyası',
    'Sign out?': 'Çıxış edilsin?', 'Your data stays safe in your Google account. Sign in again to see it.': 'Məlumatlarınız Google hesabınızda təhlükəsiz qalır. Görmək üçün yenidən daxil olun.',
    'Backup & restore': 'Ehtiyat nüsxə və bərpa', 'Download backup (.json)': 'Ehtiyat nüsxəni yüklə (.json)', 'Restore from backup…': 'Ehtiyat nüsxədən bərpa et…',
    'expenses': 'xərc', 'categories': 'kateqoriya', 'subcategories': 'alt kateqoriya', 'Import expenses': 'Xərcləri idxal et', 'Choose CSV / Excel file…': 'CSV / Excel faylı seçin…',
    'Download template': 'Şablonu yüklə', 'Export all data': 'Bütün məlumatları ixrac et', 'All expenses (CSV)': 'Bütün xərclər (CSV)', 'All expenses (Excel)': 'Bütün xərclər (Excel)',
    'Sample data': 'Nümunə məlumatlar', 'Add sample data': 'Nümunə məlumat əlavə et', 'Danger zone': 'Təhlükəli zona', 'Delete all data…': 'Bütün məlumatları sil…',
    'Delete every expense and category and start again with the default categories.': 'Bütün xərcləri və kateqoriyaları silin və standart kateqoriyalarla yenidən başlayın.',
    'Off – data is stored only in this browser. To sync with your phone, follow': 'Söndürülüb – məlumatlar yalnız bu brauzerdə saxlanılır. Telefonla sinxronlaşdırmaq üçün tətbiq qovluğundakı',
    'in the app folder.': 'faylına baxın.', 'or': 'və ya',
    'Import from a CSV or Excel file. The first row must be headers:': 'CSV və ya Excel faylından idxal edin. Birinci sətir başlıqlar olmalıdır:',
    '(optional),': '(istəyə bağlı),', '(optional). Dates can be': '(istəyə bağlı). Tarix belə ola bilər:',
    '. Missing categories are created automatically.': '. Olmayan kateqoriyalar avtomatik yaradılır.',
    'Restore backup?': 'Ehtiyat nüsxə bərpa edilsin?', 'Replace and restore': 'Əvəz et və bərpa et', 'Delete ALL data?': 'BÜTÜN məlumatlar silinsin?',
    'Delete everything': 'Hamısını sil', 'All data deleted': 'Bütün məlumatlar silindi', 'Import': 'İdxal et',
    'Up to date': 'Yenilənib', 'Backup downloaded': 'Ehtiyat nüsxə yükləndi', 'Remove sample data?': 'Nümunə məlumatlar silinsin?', 'Remove': 'Sil',
    '✓ Protected from automatic browser cleanup': '✓ Brauzerin avtomatik təmizləməsindən qorunur',
    'Browser may clear data if disk is low – keep backups': 'Disk dolarsa brauzer məlumatları silə bilər – ehtiyat nüsxə saxlayın',
    'Add about 120 days of realistic sample expenses to explore the dashboard and reports. They are marked “Sample data” and can be removed in one click.': 'İdarə panelini və hesabatları sınamaq üçün təxminən 120 günlük nümunə xərc əlavə edin. Onlar “Sample data” kimi işarələnir və bir kliklə silinə bilər.'
  };

  const backupTip = 'Mütəmadi olaraq ehtiyat nüsxə yükləyin – məsələn, OneDrive və ya Google Drive qovluğunuza – və istənilən cihazda bərpa edin.';
  // Phrases with numbers / amounts / dates. Order matters: first match wins.
  // Azerbaijani ordinal suffix follows the last digit: 1-ci, 2-ci, 3-cü, 4-cü, 5-ci, 6-cı, 7-ci, 8-ci, 9-cu, 10-cu
  const ord = n => n + ({ 1: '-ci', 2: '-ci', 3: '-cü', 4: '-cü', 5: '-ci', 6: '-cı', 7: '-ci', 8: '-ci', 9: '-cu', 0: '-cu' })[String(n).slice(-1)];
  const PATTERNS = [
    [/^(\d+) expenses?( ·)?$/, m => m[1] + ' xərc' + (m[2] || '')],
    [/^(\d+) days?$/, m => m[1] + ' gün'],
    [/^(\d+) open$/, m => m[1] + ' açıq'],
    [/^Due (.+)$/, m => 'Son tarix: ' + m[1]],
    [/^Overdue since (.+)$/, m => 'Gecikib: ' + m[1]],
    [/^of (.+)$/, m => 'cəmi ' + m[1]],
    [/^Repayment is more than what is left \((.+)\)\.$/, m => 'Qaytarma qalan məbləğdən çoxdur (' + m[1] + ').'],
    [/^(\d+) subcategor(?:y|ies)$/, m => m[1] + ' alt kateqoriya'],
    [/^Show (\d+) subcategories$/, m => m[1] + ' alt kateqoriyanı göstər'],
    [/^([▸▾]) Deleted categories with history \((\d+)\)$/, m => m[1] + ' Tarixçəsi olan silinmiş kateqoriyalar (' + m[2] + ')'],
    [/^(.+) of total$/, m => 'cəmin ' + m[1]],
    [/^Today, (.+)$/, m => 'Bu gün, ' + m[1]], [/^Yesterday, (.+)$/, m => 'Dünən, ' + m[1]],
    [/^This week: (.+)$/, m => 'Bu həftə: ' + m[1]], [/^This month: (.+)$/, m => 'Bu ay: ' + m[1]], [/^This year: (.+)$/, m => 'Bu il: ' + m[1]],
    [/^Monthly budget · (.+)$/, m => 'Aylıq büdcə · ' + m[1]],
    [/^(.+) over budget$/, m => 'Büdcədən ' + m[1] + ' artıq'],
    [/^Spent (.+?) of (.+?) \((.+?)\)(?: · (.+) per day for (\d+) days?)?$/, m => 'Xərclənib: ' + m[1] + ' / ' + m[2] + ' (' + m[3] + ')' + (m[4] ? ' · ' + m[5] + ' gün ərzində gündə ' + m[4] : '')],
    [/^per day for (\d+) more days?$/, m => 'xərcləyə bilərsiniz (daha ' + m[1] + ' gün)'],
    [/^(.+) used$/, m => m[1] + ' istifadə olunub'],
    [/^(.+) left$/, m => m[1] + ' qalıb'],
    [/^(.+) over$/, m => m[1] + ' artıq'],
    [/^No budget set for (.+)\.$/, m => m[1] + ' üçün büdcə təyin edilməyib.'],
    [/^(\d+) finished months?$/, m => m[1] + ' bitmiş ay'],
    [/^Budget for (.+)$/, m => m[1] + ' üçün büdcə'],
    [/^Every month from (.+)$/, m => m[1] + ' ayından etibarən hər ay'],
    [/^Only (.+)$/, m => 'Yalnız ' + m[1]],
    [/^Level (\d+)$/, m => ord(Number(m[1])) + ' səviyyə'],
    [/^Average (.+) each$/, m => 'Orta hesabla hər biri ' + m[1]],
    [/^Wk of (.+)$/, m => m[1] + ' həftəsi'],
    [/^(Date|Title|Category|Amount) ([▲▼])$/, m => AZ[m[1]] + ' ' + m[2]],
    [/^Show more \((\d+) remaining\)$/, m => 'Daha çox göstər (' + m[1] + ' qalıb)'],
    [/^Remove sample data \((\d+)\)$/, m => 'Nümunə məlumatları sil (' + m[1] + ')'],
    [/^Expense saved: (.+)$/, m => 'Xərc yadda saxlanıldı: ' + m[1]],
    [/^(\d+) expenses (deleted|moved)$/, m => m[1] + ' xərc ' + (m[2] === 'deleted' ? 'silindi' : 'köçürüldü')],
    [/^(\d+) sample expenses (added|removed)$/, m => m[1] + ' nümunə xərc ' + (m[2] === 'added' ? 'əlavə edildi' : 'silindi')],
    [/^Created (.+?)( · Last edited (.+))?$/, m => 'Yaradılıb: ' + m[1] + (m[2] ? ' · Son dəyişiklik: ' + m[3] : '')],
    [/^Delete (\d+) expenses\?$/, m => m[1] + ' xərc silinsin?'], [/^Delete (\d+)$/, m => m[1] + ' xərci sil'],
    [/^(.+) · Last edited (.+)$/, m => m[1] + ' · Son dəyişiklik: ' + m[2]],
    [/^✓ Verified: Sum of categories = Level 1 total \((.+)\)$/, m => '✓ Yoxlanıldı: kateqoriyaların cəmi = 1-ci səviyyənin cəmi (' + m[1] + ')'],
    [/^✓ Verified: Every category total = its subcategories \+ direct expenses$/, () => '✓ Yoxlanıldı: hər kateqoriyanın cəmi = alt kateqoriyalar + birbaşa xərclər'],
    [/^(.+) · (\d+) expenses?$/, m => m[1] + ' · ' + m[2] + ' xərc'],
    [/^Expense Manager · data schema v(\d+)$/, m => 'Xərc İdarəçisi · məlumat sxemi v' + m[1]],
    [/^Your data is stored in this browser on this device \(Browser database \(IndexedDB\)\)\. (.*)$/, m => 'Məlumatlarınız bu cihazda, bu brauzerdə saxlanılır (brauzer verilənlər bazası). ' + backupTip],
    [/^Your data is stored in: Cloud – your Google account \(Firebase\)\. An extra backup file is still a good idea\. (.*)$/, () => 'Məlumatlarınız buludda – Google hesabınızda (Firebase) saxlanılır. Əlavə ehtiyat nüsxə faylı yenə də faydalıdır. ' + backupTip],
    [/^\. Your data is saved in your Google account \(Firebase\) and syncs across devices\.$/, () => '. Məlumatlarınız Google hesabınızda (Firebase) saxlanılır və cihazlar arasında sinxronlaşır.']
  ];

  function translate(core) {
    if (Object.prototype.hasOwnProperty.call(AZ, core)) return AZ[core];
    for (const [re, fn] of PATTERNS) { const m = core.match(re); if (m) return fn(m); }
    return null;
  }

  I.t = function (s) {
    if (I.lang !== 'az' || !s) return s;
    const lead = s.match(/^\s*/)[0], trail = s.match(/\s*$/)[0], core = s.trim();
    if (!core) return s;
    const out = translate(core);
    return out == null ? s : lead + out + trail;
  };

  const SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, CODE: 1 };
  const ATTRS = ['placeholder', 'title', 'aria-label'];

  function translateTree(root) {
    if (!root) return;
    if (root.nodeType === 3) { translateText(root); return; }
    if (root.nodeType !== 1 || SKIP[root.nodeName]) return;
    translateAttrs(root);
    const w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode: n => (n.nodeType === 1 && SKIP[n.nodeName]) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
    });
    let n;
    while ((n = w.nextNode())) { if (n.nodeType === 3) translateText(n); else translateAttrs(n); }
  }
  function translateText(node) {
    const v = node.nodeValue;
    if (!v || !/[A-Za-z]/.test(v)) return;
    const t = I.t(v);
    if (t !== v) node.nodeValue = t;
  }
  function translateAttrs(el) {
    for (const a of ATTRS) {
      const v = el.getAttribute && el.getAttribute(a);
      if (v && /[A-Za-z]/.test(v)) { const t = I.t(v); if (t !== v) el.setAttribute(a, t); }
    }
  }

  I.start = function () {
    document.documentElement.lang = I.lang === 'az' ? 'az' : 'en';
    if (I.lang !== 'az') return;
    translateTree(document.body);
    new MutationObserver(muts => {
      for (const m of muts) {
        if (m.type === 'characterData') translateText(m.target);
        else if (m.type === 'attributes') translateAttrs(m.target);
        else m.addedNodes.forEach(translateTree);
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  };

  App.i18n = I;
  document.addEventListener('DOMContentLoaded', () => I.start());
})();
