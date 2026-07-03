let activeLanguage: 'en' | 'fr' = 'en';

export const currentLanguage = (): 'en' | 'fr' => activeLanguage;

export const setLanguageState = (lang: 'en' | 'fr') => {
  activeLanguage = lang;
};

export const dictionary: Record<string, string> = {
  // Brand/Header
  'Debt Elimination Engine': "Moteur d'élimination de la dette",
  'Algorithmic optimization engine engineered to eliminate interest friction and accelerate your path to zero debt.':
    "Moteur d'optimisation algorithmique conçu pour éliminer la friction des intérêts et accélérer votre parcours vers le désendettement total.",
  Mortgage: 'Hypothèque',
  'Credit Card': 'Carte de crédit',
  'Engine Tools & Settings': 'Outils du moteur et paramètres',
  'Open Engine Tools and Settings Menu': 'Ouvrir le menu des outils et des paramètres du moteur',

  // Settings Menu
  'Portability & Sync': 'Portabilité et synchro',
  'Secure Sync & Portability': 'Synchro et portabilité sécurisées',
  'Customize Dashboard Layout': 'Personnaliser la disposition du tableau de bord',
  'Engine Logic': 'Logique du moteur',
  'Constraints & Limits': 'Contraintes et limites',
  'App Preferences': "Préférences de l'application",
  Complexity: 'Complexité',
  Simple: 'Simple',
  Advanced: 'Avancé',
  Region: 'Région',
  Appearance: 'Apparence',
  'Dark Mode': 'Mode sombre',
  'System Operations': 'Opérations système',
  'Reset Application Data': "Réinitialiser les données de l'application",
  Language: 'Langue',
  French: 'Français',

  // Side bar inputs
  'Scenario Profile Setup': 'Configuration du scénario',
  'Home Price ($)': 'Prix de la propriété ($)',
  'Down Payment ($)': 'Mise de fonds ($)',
  'Current Balance ($)': 'Solde actuel ($)',
  'Interest Rate (APR %)': "Taux d'intérêt (TAP %)",
  'Amortization (Years)': 'Amortissement (années)',
  'Minimum Payment Rule': 'Règle de versement minimal',
  'Min Payment %': 'Versement min. %',
  'Interest + Principal %': 'Intérêt + Principal %',
  'Flat Minimum ($)': 'Minimum fixe ($)',
  'Term Length (Years)': 'Durée du terme (années)',
  Compounding: 'Capitalisation',
  'Aggressive Strategy': 'Stratégie agressive',
  'Payment Frequency': 'Fréquence des versements',
  'Extra Payment Surplus ($)': 'Versement excédentaire supplémentaire ($)',
  'Monthly Surplus ($)': 'Excédent mensuel ($)',
  'One-Time Lump Sum Payment ($)': 'Versement forfaitaire unique ($)',
  'Scheduled Future Lump Sums': 'Versements forfaitaires programmés',
  'Add Scheduled Row': 'Ajouter un versement programmé',
  'Start Date': 'Date de début',
  'Table Label': 'Libellé du tableau',
  DATE: 'DATE',
  PERIOD: 'PÉRIODE',
  'Opportunity Cost': "Coût d'opportunité",
  'Expected Investment Return (%/Year)': 'Rendement prévu des investissements (%/an)',
  'Taxes & Insurance': 'Taxes et assurances',
  'Property Tax ($/Year)': 'Taxe foncière ($/année)',
  'Home Insurance ($/Year)': 'Assurance habitation ($/année)',
  'HOA Fees ($/Month)': 'Frais de condo/HOA ($/mois)',
  'PMI (%/Year)': 'PMI (%/année)',
  'Refinancing Rate Shock': 'Choc de taux au refinancement',
  'Adjust the interest rates for each term renewal. Payments stay constant, and the remaining amortization will automatically expand or shrink.':
    "Ajustez les taux d'intérêt pour chaque renouvellement de terme. Les versements restent constants et l'amortissement restant s'allonge ou se raccourcit automatiquement.",
  Reset: 'Réinitialiser',
  'Share Strategy': 'Partager la stratégie',

  // Solver
  'Target Payoff Goal Solver': "Solveur d'objectif de remboursement",
  'Solve for the exact monthly or lump-sum payment needed to meet a target payoff year.':
    'Calculez le versement mensuel ou forfaitaire exact requis pour atteindre une année cible de remboursement.',
  'Target Payoff Timeline:': 'Délai de remboursement cible :',
  'Required Monthly Extra': 'Supplément mensuel requis',
  'Required Weekly Extra': 'Supplément hebdomadaire requis',
  'Required Bi-Weekly Extra': 'Supplément bihebdomadaire requis',
  'Required Semi-Monthly Extra': 'Supplément bimensuel requis',
  'Apply to Monthly': 'Appliquer au mensuel',
  'Apply to Weekly': "Appliquer à l'hebdomadaire",
  'Apply to Bi-Weekly': 'Appliquer au bihebdomadaire',
  'Apply to Semi-Monthly': 'Appliquer au bimensuel',
  'Required One-Time Lump Sum': 'Versement forfaitaire unique requis',
  'Apply to Lump Sum': 'Appliquer au versement forfaitaire',
  'Target is unreachable with extra payments.':
    "L'objectif est inatteignable avec ces versements supplémentaires.",

  // Concentric / Gravity
  'The Gravity of the Debt': 'La gravité de la dette',
  'Total Interest Overhead': "Frais d'intérêts cumulés",
  'Actual Lifetime Paid:': 'Payé au total durant la vie :',

  // Financial Summary
  'Financial Summary': 'Résumé financier',
  'Original Debt': "Dette d'origine",
  'Balance at Term End': 'Solde à la fin du terme',
  'Actual Payoff Time': 'Délai de remboursement réel',
  'Interest Saved (vs Minimums)': 'Intérêts économisés (vs minimums)',
  'Periodic Payment Composition': 'Composition périodique du versement',
  'First Month: Principal vs. Interest': 'Premier mois : Principal vs Intérêt',

  // Heatmap
  'Extra Payment Impact Heatmap': "Carte de chaleur de l'impact des suppléments",
  'Plots Monthly Extra Surplus (Rows) vs. One-Time Lump Sum (Columns). Shows payoff reduction in years. Click a cell to apply.':
    "Représente l'excédent mensuel (lignes) vs le versement forfaitaire unique (colonnes). Indique la réduction du remboursement en années. Cliquez sur une case pour l'appliquer.",

  // Visual Analysis
  'Visual Analysis': 'Analyse visuelle',
  'Expand All Charts +': 'Agrandir tous les graphiques +',
  'Collapse All Charts −': 'Réduire tous les graphiques −',
  'Impact of Accelerated Strategy': 'Impact de la stratégie accélérée',

  // Wages Circles
  'How much interest + carrying costs represents monthly if it was rent':
    "Ce que représentent mensuellement les intérêts et les frais de portage s'il s'agissait d'un loyer",
  'How much interest represents monthly if it was rent':
    "Ce que représentent mensuellement les intérêts s'il s'agissait d'un loyer",
  'How much do you pay towards the banks wages per year':
    'Combien payez-vous pour couvrir le salaire de la banque par année',
  "How much interest you pay towards the bank's wages per year":
    "Combien d'intérêts vous payez pour couvrir le salaire de la banque par année",
  'Bank Wages': 'Salaires de la banque',
  'Rent Equivalent': 'Équivalent loyer',
  'Rent + Tax & Insurance': 'Loyer + Taxe et assurance',

  // Milestones
  'Chronological Milestone Roadmap': 'Feuille de route chronologique des étapes clés',

  // Table
  'Amortization Schedule': "Tableau d'amortissement",

  // Share Modal
  'Export your customized debt payoff strategy and share it with others or save it for your records.':
    "Exportez votre stratégie personnalisée de remboursement de dette pour la partager avec d'autres ou la sauvegarder dans vos dossiers.",
  'Save PDF': 'Sauvegarder en PDF',
  'Download strategy report to your device':
    'Téléchargez le rapport de stratégie sur votre appareil',
  'Share PDF to WhatsApp, Messenger, etc.': 'Partagez le PDF sur WhatsApp, Messenger, etc.',
  'WhatsApp Text': 'Texte WhatsApp',
  'Send strategy text summary directly': 'Envoyez directement le résumé texte de la stratégie',
  'Copy Summary': 'Copier le résumé',
  'Copy formatted summary to clipboard': 'Copiez le résumé mis en forme dans le presse-papiers',

  // Sync Modal
  'Export or restore your strategy blueprint as a secure JSON file to back up your custom scenarios and sync easily across your phone, tablet, or PC. All data remains 100% private in local storage.':
    'Exportez ou restaurez votre plan stratégique sous forme de fichier JSON sécurisé pour sauvegarder vos scénarios personnalisés et les synchroniser facilement sur votre téléphone, tablette ou PC. Toutes les données restent 100 % privées dans le stockage local.',
  'Plain JSON': 'JSON brut',
  'Export Scope': "Étendue de l'exportation",
  'All Scenarios': 'Tous les scénarios',
  'Blueprint Encryption Passcode': 'Mot de passe de chiffrement du plan',
  'Enter a secure passcode': 'Entrez un mot de passe sécurisé',
  'Export Strategy Blueprint': 'Exporter le plan stratégique',
  'Restore Strategy Blueprint': 'Restaurer le plan stratégique',
  'Drag & drop blueprint file here': 'Glissez-déposez le fichier de plan ici',
  'or click to browse local files': 'ou cliquez pour parcourir les fichiers locaux',

  // Limits Modal
  'The mathematical calculation engine enforces the following validation boundaries to ensure stable calculations, thread protection, and realistic projections.':
    'Le moteur de calcul mathématique applique les limites de validation suivantes afin de garantir des calculs stables, la protection des threads et des projections réalistes.',
  'Amortization Span': "Période d'amortissement",
  '0.1 to 100 Years': '0,1 à 100 ans',
  'Interest Rate Bounds': "Limites du taux d'intérêt",
  '0.0% to 100.0% APR': '0,0 % à 100,0 % TAP',
  'Down Payment Threshold': 'Seuil de mise de fonds',
  'Must be < Home Price': 'Doit être inférieur au prix de la propriété',
  'Refinance Term Bounds': 'Limites de durée du terme',
  'Must be > 0 and <= Amortization':
    "Doit être supérieur à 0 et inférieur ou égal à l'amortissement",
  'Rate Shock Density Guard': 'Protection contre la densité du choc de taux',
  'Max 50 Refinance Terms': 'Maximum 50 renouvellements de terme',
  'Minimum Starting Balance': 'Solde de départ minimal',
  'Must be > $0.00': 'Doit être supérieur à 0,00 $',
  '0.0% to 200.0% APR': '0,0 % à 200,0 % TAP',
  'Province Min. Payment Laws': 'Lois provinciales sur le paiement minimal',
  'Ontario (3%) / Quebec (5%)': 'Ontario (3 %) / Québec (5 %)',
  'Discretionary Payment': 'Versement discrétionnaire',
  'Non-negative (>= $0)': 'Non négatif (supérieur ou égal à 0 $)',

  // Layout Modal
  'Customize which charts and visualizations are visible on your dashboard, and adjust their sizes.':
    'Personnalisez les graphiques et visualisations visibles sur votre tableau de bord et ajustez leur taille.',
  'Amortization Balance Chart': "Graphique du solde d'amortissement",
  'Equity Build Up Chart': "Graphique de l'accumulation d'équité",
  'Cumulative Outflow Chart': 'Graphique des sorties cumulées',
  'Annual Cash Flow Chart': 'Graphique des flux de trésorerie annuels',
  'Payment Composition Chart': 'Graphique de la composition du versement',
  'Interest Comparison Chart': 'Graphique de comparaison des intérêts',
  'Payoff Time Comparison Chart': 'Graphique de comparaison du délai de remboursement',
  'LTV Chart': 'Graphique prêt-valeur (LTV)',
  'Opportunity Cost Chart': "Graphique du coût d'opportunité",
  'Interest Wages Visualizer': "Visualisateur du coût en salaire d'intérêt",
  'Milestone Timeline Nodes': 'Étapes clés de la chronologie',
  'Apply & Save Layout': 'Appliquer et enregistrer la disposition',

  // Dropdown options
  'Ontario Preset (3% / Int + 1% / min $10)': 'Ontario préréglé (3 % / Int + 1 % / min 10 $)',
  'Quebec Preset (5% / Int + 1% / min $10)': 'Québec préréglé (5 % / Int + 1 % / min 10 $)',
  'Canadian (Semi-Annual)': 'Canadien (capitalisation semestrielle)',
  'US / UK / AU / NZ (Monthly/Daily)': 'É-U / RU / AU / NZ (capitalisation mensuelle/quotidienne)',
  'Weekly (52/Year)': 'Hebdomadaire (52/année)',
  'Bi-Weekly (26/Year)': 'Bihebdomadaire (26/année)',
  'Semi-Monthly (24/Year)': 'Bimensuel (24/année)',

  // Help Tooltips (index.html)
  'The gross transactional purchase price of the real estate asset before deducting any down payment, adjustments, or transaction fees. Note: Banks may apply local valuation models which can alter exact loan calculations.':
    "Le prix d'achat brut de la propriété avant déduction de la mise de fonds, des ajustements ou des frais de transaction. Note : Les banques peuvent appliquer des modèles d'évaluation locaux qui modifient les calculs exacts du prêt.",
  'The upfront equity capital contributed in cash. Higher thresholds mitigate initial loan-to-value (LTV) exposure and directly deflate the starting principal. Note: Exact minimum down payment requirements vary by region and property type.':
    'Le capital initial versé en espèces. Des seuils plus élevés réduisent le ratio prêt-valeur (LTV) initial et réduisent directement le principal de départ. Note : Les exigences de mise de fonds minimale varient selon la région et le type de propriété.',
  'The aggregate statement balance currently outstanding. This is the entire volume of compounding debt subject to dangerous revolving interest rates. Note: Daily balance variations and pending charges may cause statement totals to differ slightly.':
    "Le solde total du compte actuellement impayé. Il s'agit de la totalité de la dette accumulée assujettie à des taux d'intérêt rotatifs dangereux. Note : Les variations quotidiennes de solde et les frais en attente peuvent faire varier légèrement les totaux des relevés.",
  'The Annual Percentage Rate charged by the lender. Fractional variations compound rapidly, scaling total lifetime borrowing friction exponentially. Note: Real APR may include lender fees not captured here. Bank calculations may vary slightly due to daily interest accrual conventions.':
    "Le taux annuel combiné (TAP) facturé par le prêteur. Les variations fractionnaires se capitalisent rapidement, augmentant de façon exponentielle les frais d'emprunt sur la durée de vie du prêt. Note : Le TAP réel peut inclure des frais de prêteur non saisis ici.",
  'The contractual timeline required to completely eradicate the debt balance through baseline structured minimum installment payments. Note: Lender formulas and payment frequencies can affect the exact payoff timeline.':
    'La durée contractuelle requise pour rembourser entièrement le solde de la dette par des versements périodiques minimaux. Note : Les formules des prêteurs et les fréquences de versement peuvent influer sur le délai exact de remboursement.',
  'Percentage of outstanding balance to charge as the minimum payment threshold.':
    'Le pourcentage du solde impayé pour calculer le paiement minimal requis.',
  'The interest portion of the cycle plus this percentage of the remaining principal balance.':
    "La part d'intérêt du cycle plus ce pourcentage du solde de principal restant.",
  'The absolute floor payment amount. The calculated minimum will never fall below this limit.':
    'Le montant absolu minimal du versement. Le versement minimal calculé ne sera jamais inférieur à cette limite.',
  'The duration of your active interest rate contract. Upon expiration, the remaining balance must be renegotiated or renewed at prevailing market yields. Note: Local regulations may restrict term lengths or mandate specific renewal conditions.':
    "La durée de votre contrat de taux d'intérêt actif. À l'expiration, le solde restant doit être renégocié ou renouvelé aux taux du marché en vigueur. Note : Les réglementations locales peuvent limiter la durée du terme.",
  'The frequency of interest calculations. Canadian law dictates semi-annual compounding for fixed mortgages, resulting in a lower Effective Annual Rate than US, UK, AU, and NZ monthly/daily compounding. Note: Some non-traditional lenders may use custom compounding models.':
    "La fréquence de calcul des intérêts. La loi canadienne prescrit une capitalisation semestrielle pour les prêts hypothécaires à taux fixe, ce qui donne un taux annuel effectif plus bas que la capitalisation mensuelle ou quotidienne des É-U, du RU, de l'AU et de la NZ.",
  'Accelerated schedules divide standard monthly distributions into halves or quarters, non-disruptively forcing an extra full monthly installment against principal per calendar year. Note: Banks may calculate accelerated payments using slightly different formulas (e.g. dividing monthly payment by 2 vs. 26 bi-weekly periods).':
    "Les fréquences accélérées divisent les paiements mensuels standard en deux ou en quatre, ce qui force l'application d'un versement mensuel complet supplémentaire sur le principal par année civile. Note : Les banques peuvent utiliser des formules légèrement différentes.",
  "Discretionary capital injected straight toward principal reduction per cycle, entirely bypassing the lender's interest calculation mechanism. Note: Some lenders restrict prepayments or charge penalty fees for exceeding yearly thresholds.":
    'Capital discrétionnaire injecté directement pour réduire le principal à chaque cycle, contournant complètement le calcul des intérêts du prêteur. Note : Certains prêteurs limitent les remboursements anticipés ou imposent des pénalités.',
  'Incremental capital deployed monthly above the mandatory minimum threshold, locking in an un-leveraged, guaranteed return equal to the account APR. Note: Review your credit agreement for terms regarding surplus payments.':
    'Capital supplémentaire versé mensuellement au-dessus du minimum obligatoire, garantissant un rendement sans levier égal au taux de la carte de crédit (TAP). Note : Consultez votre contrat de crédit pour connaître les conditions relatives aux paiements excédentaires.',
  'A one-time payment applied directly to the principal balance at the start of the schedule. Highly effective for visualising the compound impact of bonuses, tax returns, or inheritances.':
    "Un versement unique appliqué directement sur le solde de principal au début du calendrier de remboursement. Très efficace pour visualiser l'impact composé des primes, des remboursements d'impôt ou des héritages.",
  'Choose whether the amortization schedule labels each installment by calendar date (e.g. Jun 1, 2026) or by numeric cycle period (e.g. P1, P2, P3). Note: Calendar date assumes payments occur exactly on schedule with no deferred periods.':
    "Déterminez si le calendrier d'amortissement affiche chaque versement par date civile (ex. 1 juin 2026) ou par numéro de période (ex. P1, P2, P3). Note : La date civile suppose des versements exactement à temps sans report.",
  'A strategic net worth comparison. Evaluates whether aggressive debt pay-down yields superior equity value versus allocating those exact liquid surpluses to market index investments. Note: Market returns are projections and not guaranteed. Historical averages are not indicative of future performance.':
    "Comparaison stratégique de la valeur nette. Évalue si un remboursement agressif de la dette donne une valeur nette supérieure par rapport à l'investissement de ces mêmes excédents sur les marchés financiers.",
  'Integrates escrow housing expenses (PITI components) to map non-equity liquidity factors. Note: Tax assessments, insurance premiums, and HOA fees fluctuate over time; calculations are close estimates.':
    'Intègre les frais de logement (composants PITI) pour modéliser les facteurs de liquidité hors équité.',
  'Integrates escrow cash flow items (PITI components) to map non-equity housing expenses that impact gross monthly liquidity. Note: Tax assessments, insurance premiums, and HOA fees fluctuate over time; calculations are close estimates.':
    'Intègre les éléments de compte séquestre (composantes PITI) pour cartographier les dépenses de logement hors équité qui influent sur vos liquidités mensuelles.',
  'Simulate term renewal interest rate adjustments. Projects the dynamic impact on remaining amortization under the assumption that the periodic payment remains constant. Note: Calculations are theoretical and assume payments are unchanged at renewal; actual bank refinance terms may vary.':
    "Simulez les ajustements de taux d'intérêt lors des renouvellements de terme. Projette l'impact dynamique sur l'amortissement restant sous l'hypothèse que le paiement périodique reste inchangé.",
  'Drag the slider to set your target payoff timeline in years. The solver will instantly calculate the exact monthly extra payment or one-time lump sum required to reach your goal.':
    'Faites glisser le curseur pour définir votre objectif de remboursement en années. Le solveur calculera instantanément le paiement mensuel supplémentaire ou le versement forfaitaire unique requis pour y parvenir.',
  'A spatial representation of cumulative interest overhead. The relative size of the interest envelope (red) highlights capital inefficiencies over baseline asset cost (blue). Note: Calculations are close estimations; banks may use proprietary interest formulas causing minor variations.':
    "Représentation spatiale des intérêts cumulés. La taille de l'enveloppe d'intérêt (rouge) met en évidence l'inefficacité du capital par rapport au coût de l'actif de base (bleu).",
  'The interest accrued daily, representing a direct fee paid to the bank every 24 hours. Note: Actual bank accruals may vary slightly based on calculations (e.g. 365 vs. 360 days).':
    'Les intérêts cumulés quotidiennement, représentant des frais directs payés à la banque toutes les 24 heures. Note : Les calculs réels des banques peuvent varier légèrement.',
  'The verified principal debt remaining at term end, indicating refinancing risk. Note: Assumes standard payment schedule with no pre-payments or missed payments. Bank formulas may vary slightly.':
    'Le solde de principal restant à la fin du terme, indiquant le risque de refinancement. Note : Suppose un calendrier de paiement standard sans versements anticipés ni retards.',
  'Tracks structural shifts in installment ratios. Over time, reducing the principal shrinks the interest wedge. Note: Commercial bank schedules may vary slightly due to interest rounding routines.':
    "Suit l'évolution structurelle de la répartition de vos versements. Avec le temps, la réduction du principal réduit la part des intérêts.",
  'A visual matrix showing payoff time reduction (in years) for combinations of monthly extra payments (rows) and one-time lump sum payments (columns). Click any cell to apply that strategy immediately.':
    "Une matrice visuelle montrant la réduction du temps de remboursement (en années) pour différentes combinaisons de versements mensuels supplémentaires (lignes) et de versements forfaitaires uniques (colonnes). Cliquez sur une cellule pour l'appliquer.",
  'Algorithmic modeling tracking debt reduction trajectories. Note: Cards can be dragged to customize your layout. Calculations are close estimates; exact bank totals may vary due to custom formulas.':
    'Modélisation algorithmique suivant les trajectoires de réduction de la dette. Note : Les cartes peuvent être glissées pour personnaliser votre disposition.',
  'A dynamic timeline highlighting critical wealth milestones. Note: Projections assume continuous, uninterrupted surplus payments as scheduled. Commercial timelines may vary due to custom bank policies.':
    'Une chronologie dynamique soulignant les étapes critiques du remboursement. Note : Les projections supposent des versements excédentaires continus et sans interruption.',
  'A granular ledger mapping principal pay-down and interest decay curves. Note: Minor variances can occur based on how individual lenders round daily interest and process extra payments.':
    'Un grand livre détaillé cartographiant le remboursement du principal et la courbe de décroissance des intérêts. Note : Des écarts mineurs peuvent se produire.',

  // Miscellanea
  'Ontario (3 %) / Quebec (5 %)': 'Ontario (3 %) / Québec (5 %)',

  // Chart Titles & Axes
  'Debt Balance Over Time': 'Solde de la dette au fil du temps',
  'Equity Build-Up': "Accumulation d'équité",
  'Cumulative Outflow': 'Sorties de fonds cumulées',
  'Annual Cash Flow': 'Flux de trésorerie annuels',
  'Payment Composition': 'Composition des versements',
  'Lifetime Breakdown': 'Répartition sur la durée de vie',
  'LTV (Loan To Value) & PMI (Private Mortgage Insurance) Drop':
    'Ratio prêt-valeur (LTV) et fin du PMI',
  'Projection: Pay Debt vs Invest': 'Projection : Rembourser la dette vs Investir',
  'Total Interest Cost': 'Coût total en intérêts',
  'Time to Pay Off': 'Temps pour rembourser',
  'LTV (%)': 'LTV (%)',
  'Net Worth ($)': 'Valeur nette ($)',

  // Trace Series Legends
  Baseline: 'Référence',
  Actual: 'Réel',
  'Term End': 'Fin du terme',
  'Debt Free': 'Libre de dette',
  Interest: 'Intérêts',
  Principal: 'Principal',
  Escrow: 'Frais séquestres',
  Extra: 'Supplément',
  'Pay Debt Fast': 'Rembourser rapidement',
  'Invest Surplus': 'Investir les excédents',
  'Debt Free Year': 'Année de libération',

  // Table Headers
  'Date / #': 'Date / N°',
  'Total Payment': 'Versement total',
  'Escrow (Tax/Ins)': 'Frais séquestres (Taxe/Assur)',

  // Frequencies
  Monthly: 'Mensuel',
  Weekly: 'Hebdomadaire',
  'Bi-Weekly': 'Bihebdomadaire',
  'Semi-Monthly': 'Bimensuel',
  'Accelerated Bi-Weekly': 'Bihebdomadaire accéléré',

  // Heatmap UI Details
  'Hover over or tap any cell in the heatmap grid to view strategy details':
    'Survolez ou appuyez sur une case de la grille pour afficher les détails.',
  'Selected Plan Details': 'Détails de la stratégie sélectionnée',
  'Plan Details Preview': 'Aperçu de la stratégie',
  'Monthly Extra': 'Supplément mensuel',
  'One-Time Lump Sum': 'Versement forfaitaire unique',
  'Timeline Saved': 'Temps économisé',
  'Apply Strategy': 'Appliquer la stratégie',
  'No Lump Sum': 'Sans versement',
  'No Extra': 'Sans supplément',

  // Nested Label text nodes
  'Interest Saved ': 'Intérêts économisés ',
  '(vs Minimums)': '(vs minimums)',
  'Interest Saved': 'Intérêts économisés'
};

export const t = (key: string): string => {
  if (activeLanguage === 'en') return key;
  return dictionary[key] || key;
};

const walkTextNodes = (root: Node, callback: (node: Text) => void) => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const parent = node.parentNode as HTMLElement | null;
    if (parent) {
      const tagName = parent.tagName;
      if (tagName === 'SCRIPT' || tagName === 'STYLE') {
        continue;
      }
    }
    callback(node as Text);
  }
};

export const applyTranslations = (lang: 'en' | 'fr') => {
  setLanguageState(lang);
  document.documentElement.setAttribute('lang', lang);

  if (lang === 'en') {
    // Restore all text nodes
    walkTextNodes(document.body, (node) => {
      const nodeRecord = node as unknown as Record<string, string>;
      if (nodeRecord.originalText !== undefined) {
        node.nodeValue = nodeRecord.originalText;
      }
    });

    // Restore attributes
    const elementsWithAttrs = document.querySelectorAll('[placeholder], [title], [aria-label]');
    elementsWithAttrs.forEach((el) => {
      const htmlEl = el as HTMLElement;
      const elRecord = htmlEl as unknown as Record<string, string>;
      if (elRecord.originalPlaceholder !== undefined) {
        htmlEl.setAttribute('placeholder', elRecord.originalPlaceholder);
      }
      if (elRecord.originalTitle !== undefined) {
        htmlEl.setAttribute('title', elRecord.originalTitle);
      }
      if (elRecord.originalAriaLabel !== undefined) {
        htmlEl.setAttribute('aria-label', elRecord.originalAriaLabel);
      }
    });
  } else {
    // Translate all text nodes
    walkTextNodes(document.body, (node) => {
      const trimmed = node.nodeValue?.trim() || '';
      const translation = dictionary[trimmed];
      if (translation) {
        const nodeRecord = node as unknown as Record<string, string>;
        if (nodeRecord.originalText === undefined) {
          nodeRecord.originalText = node.nodeValue!;
        }
        node.nodeValue = node.nodeValue!.replace(trimmed, translation);
      }
    });

    // Translate attributes
    const elementsWithAttrs = document.querySelectorAll('[placeholder], [title], [aria-label]');
    elementsWithAttrs.forEach((el) => {
      const htmlEl = el as HTMLElement;
      const elRecord = htmlEl as unknown as Record<string, string>;
      const placeholder = htmlEl.getAttribute('placeholder');
      if (placeholder && dictionary[placeholder]) {
        if (elRecord.originalPlaceholder === undefined) {
          elRecord.originalPlaceholder = placeholder;
        }
        htmlEl.setAttribute('placeholder', dictionary[placeholder]);
      }
      const title = htmlEl.getAttribute('title');
      if (title && dictionary[title]) {
        if (elRecord.originalTitle === undefined) {
          elRecord.originalTitle = title;
        }
        htmlEl.setAttribute('title', dictionary[title]);
      }
      const ariaLabel = htmlEl.getAttribute('aria-label');
      if (ariaLabel && dictionary[ariaLabel]) {
        if (elRecord.originalAriaLabel === undefined) {
          elRecord.originalAriaLabel = ariaLabel;
        }
        htmlEl.setAttribute('aria-label', dictionary[ariaLabel]);
      }
    });
  }
};
