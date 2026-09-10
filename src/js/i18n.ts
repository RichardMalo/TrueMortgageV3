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
  'Personal Loan': 'Prêt personnel',
  'Personal / Auto Loan': 'Prêt personnel / auto',
  'Loan Amount ($)': 'Montant du prêt ($)',
  'Origination Fee ($)': 'Frais de dossier ($)',
  'Property & Loan': 'Propriété & prêt',
  'Revolving Debt': 'Dette renouvelable',
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
  'Compounding Method': 'Méthode de capitalisation',
  'Compounding Method:': 'Méthode de capitalisation :',
  'Simple Interest': 'Intérêt simple',
  'Daily Compounding': 'Capitalisation quotidienne',
  'Aggressive Strategy': 'Stratégie agressive',
  'Payment Frequency': 'Fréquence des versements',
  'Extra Payment Surplus ($)': 'Versement excédentaire supplémentaire ($)',
  'Estimated Amount Saved Until Payoff Date':
    "Montant estimé économisé jusqu'à la date de remboursement",
  'Monthly Surplus Payment ($)': "Paiement d'excédent mensuel ($)",
  'Monthly Surplus Payment:': "Paiement d'excédent mensuel :",
  'One-Time Lump Sum Payment ($)': 'Versement forfaitaire unique ($)',
  'This Payment Saves You:': "Ce paiement vous permet d'économiser :",
  'This Monthly Payment Saves You:': "Ce versement mensuel vous permet d'économiser :",
  'This Semi-Monthly Payment Saves You:': "Ce versement bimensuel vous permet d'économiser :",
  'This Bi-Weekly Payment Saves You:': "Ce versement bihebdomadaire vous permet d'économiser :",
  'This Weekly Payment Saves You:': "Ce versement hebdomadaire vous permet d'économiser :",
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
  'Enable Goal Solver': "Activer le solveur d'objectif",
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
  'Never (Negative Amortization)': 'Jamais (amortissement négatif)',
  'Never (No Payoff)': 'Jamais (aucun remboursement)',

  // Concentric / Gravity
  'The Gravity of the Debt': 'La gravité de la dette',
  'Total Interest Overhead': "Frais d'intérêts cumulés",
  'Actual Lifetime Paid:': 'Payé au total durant la vie :',

  // Financial Summary
  'Financial Summary': 'Résumé financier',
  'Original Debt': "Dette d'origine",
  'Balance at Term End': 'Solde à la fin du terme',
  'Actual Payoff Time': 'Délai de remboursement réel',
  'Interest Saved (vs Minimums)': 'Intérêts économisés (vs les minimums)',
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
  'Annual interest payments plus property tax and home insurance averaged into a monthly rent equivalent. For estimation purposes only.':
    "Paiements d'intérêts annuels plus taxe foncière et assurance habitation convertis en un équivalent de loyer mensuel. À titre d'estimation uniquement.",
  'Annual interest payments averaged into a monthly rent equivalent: (Annual Interest / 12), rounded up. For estimation purposes only.':
    "Paiements d'intérêts annuels convertis en un équivalent de loyer mensuel : (Intérêt annuel / 12), arrondi à l'unité supérieure. À titre d'estimation uniquement.",
  'Annual interest payments visualized as wages paid to the bank. Circles shrink over time as you build equity.':
    "Paiements d'intérêts annuels visualisés sous forme de salaires versés à la banque. Les cercles rétrécissent avec le temps à mesure que vous accumulez du capital.",
  'Bank Wages': 'Salaires de la banque',
  'Rent Equivalent': 'Équivalent loyer',
  'Rent + Tax & Insurance': 'Loyer + Taxe et assurance',
  'Calendar View of Debt': 'Calendrier de la dette',
  'Calendar View of Debt: Owned vs Bank Interest':
    'Calendrier de la dette : Propriété vs Intérêts bancaires',
  'Multi-year calendar breakdown showing each month proportion owned by you (equity & principal) versus interest paid to the bank.':
    'Calendrier pluriannuel détaillant pour chaque mois la proportion détenue par vous (capital) par rapport aux intérêts versés à la banque.',
  'Owned by You': 'Votre part (capital)',
  'Bank Interest': 'Intérêts bancaires',
  'All Years': 'Toutes les années',
  'Paid Off': 'Remboursé',

  // Milestones
  'Chronological Milestone Roadmap': 'Feuille de route chronologique des étapes clés',

  // Table
  'Amortization Schedule': "Tableau d'amortissement",
  '🚩 Term Milestone': '🚩 Échéance du terme',
  'Toggle Term Renewal Milestone': 'Afficher/masquer le jalon de renouvellement du terme',

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
  'Export CSV': 'Exporter en CSV',
  'Download raw schedule spreadsheet': 'Télécharger le chiffrier brut des versements',
  'CSV exported successfully!': 'Fichier CSV exporté avec succès !',
  'Export Amortization Table to CSV': "Exporter le tableau d'amortissement en CSV",

  // Shortcuts Modal
  'Keyboard Shortcuts': 'Raccourcis clavier',
  'Use these keyboard shortcuts anywhere in the application for rapid calculation navigation.':
    "Utilisez ces raccourcis clavier partout dans l'application pour une navigation rapide.",
  'Toggle Shortcuts Menu': 'Ouvrir/Fermer le menu des raccourcis',
  'Switch to Mortgage Mode': 'Passer au mode Hypothèque',
  'Switch to Credit Card Mode': 'Passer au mode Carte de crédit',
  'Switch to Personal Loan Mode': 'Passer au mode Prêt personnel',
  'Toggle Dark / Light Theme': 'Basculer le thème sombre / clair',
  'Open Share & Export Modal': 'Ouvrir le menu de partage et exportation',
  'Open Scenario Sandbox': 'Ouvrir le bac à sable de scénarios',
  'Close Modal / Dialog': 'Fermer la boîte de dialogue',

  // International Taxes & Strategies
  'UK Stamp Duty (SDLT)': 'Droit de timbre britannique (SDLT)',
  'Australian Stamp Duty': 'Droit de mutation australien',
  'Avalanche (Highest APR First)': 'Avalanche (TAP le plus élevé en premier)',
  'Snowball (Lowest Balance First)': 'Boule de neige (Solde le plus bas en premier)',

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

  // Form Validation Errors
  'Loan Amount must be a valid positive number.':
    'Le montant du prêt doit être un nombre positif valide.',
  'Loan Term must be a valid number between 0.1 and 50 years.':
    'La durée du prêt doit être un nombre valide entre 0,1 et 50 ans.',
  'Interest Rate must be a valid number between 0% and 100%.':
    "Le taux d'intérêt doit être un nombre valide entre 0 % et 100 %.",
  'Extra Payment must be a valid non-negative number.':
    'Le paiement supplémentaire doit être un nombre non négatif valide.',
  'Origination Fee must be a valid non-negative number.':
    'Les frais de dossier doivent être un nombre non négatif valide.',
  'Home Price must be a valid positive number.':
    'Le prix de la propriété doit être un nombre positif valide.',
  'Down Payment must be a valid non-negative number.':
    'La mise de fonds doit être un nombre non négatif valide.',
  'Down Payment cannot exceed the Home Price.':
    'La mise de fonds ne peut pas dépasser le prix de la propriété.',
  'Amortization must be a valid number between 0.1 and 100 years.':
    "L'amortissement doit être un nombre valide entre 0,1 et 100 ans.",
  'Term Length must be positive and cannot exceed the Amortization period.':
    "La durée du terme doit être positive et ne peut pas dépasser la période d'amortissement.",
  'Lump Sum Payment must be a valid non-negative number.':
    'Le versement forfaitaire doit être un nombre non négatif valide.',
  'Scheduled Lump Sum amount must be a valid non-negative number.':
    'Le montant du versement forfaitaire planifié doit être un nombre non négatif valide.',
  'Scheduled Lump Sum Payment Number must be a valid positive integer (>= 1).':
    'Le numéro de versement du versement forfaitaire planifié doit être un entier positif valide (>= 1).',
  'Property Tax must be a valid non-negative number.':
    'La taxe foncière doit être un nombre non négatif valide.',
  'Home Insurance must be a valid non-negative number.':
    "L'assurance habitation doit être un nombre non négatif valide.",
  'HOA Fees must be a valid non-negative number.':
    'Les frais de copropriété doivent être un nombre non négatif valide.',
  'PMI Rate must be a valid number between 0% and 100%.':
    'Le taux PMI doit être un nombre valide entre 0 % et 100 %.',
  'Credit Card Balance must be a valid positive number.':
    'Le solde de la carte de crédit doit être un nombre positif valide.',
  'Interest Rate must be a valid number between 0% and 200%.':
    "Le taux d'intérêt doit être un nombre valide entre 0 % et 200 %.",
  'Monthly Surplus Payment must be a valid non-negative number.':
    'Le versement mensuel supplémentaire doit être un nombre non négatif valide.',
  'Minimum Payment % must be a valid number between 0% and 100%.':
    'Le versement minimum % doit être un nombre valide entre 0 % et 100 %.',
  'Interest + Principal % must be a valid number between 0% and 100%.':
    'Intérêt + Principal % doit être un nombre valide entre 0 % et 100 %.',
  'Flat Minimum Payment must be a valid non-negative number.':
    'Le versement minimum fixe doit être un nombre non négatif valide.',
  'Expected Investment Return must be a valid number between -99.9% and 100%.':
    'Le rendement d’investissement attendu doit être un nombre valide entre -99,9 % et 100 %.',

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
  'The total agreed purchase price of the home before your down payment, closing costs, or taxes. Note: Bank appraisal values may vary slightly.':
    "Le prix d'achat total de la propriété avant votre mise de fonds, les frais de clôture ou les taxes. Note : L'évaluation de la banque peut différer légèrement.",
  'The cash amount you pay upfront. A larger down payment lowers your loan balance and saves you substantial interest over time. Note: Minimum down payment rules vary by home price.':
    "Le montant comptant que vous versez au départ. Une mise de fonds plus importante réduit votre prêt et vous fait économiser beaucoup d'intérêts. Note : Les exigences minimales varient selon le prix d'achat.",
  'The total balance currently owed on your card that is collecting interest. Note: Daily charges and pending transactions may adjust this total.':
    'Le solde total actuellement dû sur votre carte qui accumule des intérêts. Note : Les achats quotidiens et transactions en cours peuvent modifier ce total.',
  'The total amount of money borrowed for your personal or vehicle loan.':
    'Le montant total emprunté pour votre prêt personnel ou automobile.',
  'One-time upfront administration or processing fee charged by the lender to set up the loan.':
    'Frais administratifs ou de dossier uniques facturés par le prêteur pour mettre en place le prêt.',
  'The yearly interest rate charged by your lender. Even small changes in your rate add up to thousands in interest over time. Note: Actual APR may include lender fees.':
    "Le taux d'intérêt annuel facturé par votre prêteur. Même un petit écart de taux représente des milliers de dollars d'intérêts au fil du temps. Note : Le TAP réel peut inclure des frais de dossier.",
  'The total number of years it will take to pay off the loan completely with regular payments. Note: Payment frequency and extra payments can shorten this time.':
    "Le nombre total d'années nécessaires pour rembourser entièrement le prêt avec vos versements réguliers. Note : La fréquence et les paiements supplémentaires peuvent raccourcir cette période.",
  'Percentage of outstanding balance to charge as the minimum payment threshold.':
    'Le pourcentage de votre solde exigé par la banque comme paiement minimal chaque mois.',
  'The minimum payment calculated as all interest owed this month plus a small percentage of your balance.':
    'Le paiement minimal calculé comme tous les intérêts du mois plus un petit pourcentage de votre solde.',
  'The minimum dollar amount you must pay each month, even if the percentage calculation is lower.':
    'Le montant minimal en dollars à payer chaque mois, même si le calcul en pourcentage donne moins.',
  'How the bank calculates interest: Simple interest divides your annual rate by 12, while Daily compounding adds interest every day.':
    "La façon dont la banque calcule les intérêts : l'intérêt simple divise votre taux annuel par 12, tandis que la capitalisation quotidienne ajoute des intérêts chaque jour.",
  'How long your current interest rate and mortgage contract last. When this term ends, you renew your mortgage at new interest rates.':
    "La durée de validité de votre contrat hypothécaire et de votre taux d'intérêt. À la fin du terme, vous renouvelez votre prêt aux taux du marché.",
  'How often interest is calculated. Canadian fixed mortgages use semi-annual compounding (which costs slightly less), while US, UK, AU, and NZ mortgages typically compound monthly.':
    'La fréquence de calcul des intérêts. Les prêts à taux fixe au Canada utilisent une capitalisation semestrielle (qui coûte légèrement moins cher), tandis que les prêts américains, britanniques, australiens et néo-zélandais capitalisent généralement chaque mois.',
  'In Canada, if your down payment is under 20%, mortgage default insurance (CMHC/Sagen) is required by law. The insurance fee is added directly onto your mortgage balance.':
    "Au Canada, si votre mise de fonds est inférieure à 20 %, l'assurance prêt hypothécaire (SCHL/Sagen) est obligatoire. La prime est ajoutée directement au solde de votre prêt.",
  'Provincial tax on CMHC insurance premiums (ON 8%, QC 9%, SK 6%) cannot be rolled into your mortgage and must be paid in cash on closing day.':
    "La taxe provinciale sur la prime d'assurance SCHL (ON 8 %, QC 9 %, SK 6 %) ne peut pas être financée dans le prêt et doit être payée comptant chez le notaire.",
  "Estimates the government property transfer taxes due at closing in Ontario (including Toronto's municipal tax) and British Columbia, applying first-time buyer rebates where eligible.":
    "Estime les droits de mutation immobilière (taxe de bienvenue) payables à l'achat en Ontario (y compris la taxe municipale de Toronto) et en Colombie-Britannique, avec les rabais pour premiers acheteurs.",
  'Paying accelerated bi-weekly or weekly splits your monthly payment into smaller pieces, effectively making one extra monthly payment per year to pay off your mortgage years earlier.':
    'Payer aux deux semaines accéléré ou à la semaine divise vos versements en fractions plus fréquentes, équivalant à un versement mensuel complet de plus par an pour vous libérer plus vite.',
  'Extra cash paid directly toward your mortgage principal each payment. Every extra dollar skips interest completely and pays off your home much faster.':
    'Argent supplémentaire appliqué directement sur le capital à chaque versement. Chaque dollar de plus évite complètement les intérêts et rembourse votre maison beaucoup plus vite.',
  'Extra money applied straight to your loan balance each payment to eliminate the debt sooner.':
    'Montant supplémentaire appliqué directement sur le solde de votre prêt à chaque versement pour vous libérer plus rapidement.',
  "Extra money paid each month above the minimum. Because credit card interest is high, paying extra gives you a guaranteed, risk-free savings equal to your card's interest rate.":
    'Montant payé chaque mois au-dessus du minimum. Comme les taux de carte sont élevés, payer plus vous offre un rendement garanti sans risque équivalent au taux de votre carte.',
  'A single cash payment applied directly to your loan balance today (from a tax refund, bonus, or savings). It permanently cuts future interest and shortens your payoff timeline.':
    "Un versement unique appliqué directement sur votre solde aujourd'hui (provenant d'un remboursement d'impôt, prime ou épargne). Il réduit définitivement vos futurs intérêts et raccourcit votre dette.",
  'Choose whether the schedule labels payments by calendar date (e.g. Jun 1, 2026) or by payment number (e.g. P1, P2, P3).':
    "Choisissez d'afficher les paiements par date sur le calendrier (ex. 1 juin 2026) ou par numéro de versement (ex. P1, P2, P3).",
  'Compares two money strategies: paying down your debt faster (a guaranteed, risk-free return) versus investing your extra cash in the stock market (potential for higher returns, but with market volatility and taxes).':
    'Compare deux stratégies : rembourser votre dette plus vite (un rendement garanti sans risque) ou investir vos surplus en bourse (potentiel de gain plus élevé, mais avec de la volatilité et des impôts).',
  'Adds property taxes, home insurance, and condo/HOA fees to show your complete monthly housing payment (often called PITI).':
    "Ajoute les taxes foncières, l'assurance habitation et les frais de condo pour afficher votre paiement mensuel complet de logement (souvent appelé PITI).",
  'See what happens when your mortgage renews at higher or lower interest rates. Keeping your payment the same shows how many extra years or months it would take to finish paying off the loan.':
    "Voyez ce qui arrive si votre prêt est renouvelé à un taux différent. En gardant le même versement, vous verrez de combien d'années ou de mois votre remboursement sera prolongé ou raccourci.",
  'Choose the year you want to be completely debt-free. The solver instantly calculates the exact extra payment or one-time lump sum needed to get you there.':
    "Choisissez l'année où vous voulez être totalement libéré de vos dettes. Le solveur calcule instantanément le versement supplémentaire requis pour atteindre cet objectif.",
  'A visual comparison of what you borrowed (blue) versus the total interest you will pay to the bank (red). The bigger the red circle, the more interest costs you over time. Note: Calculations are close estimations; bank interest formulas and rounding conventions may vary slightly.':
    "Une comparaison visuelle entre le montant emprunté (bleu) et le total des intérêts payés à la banque (rouge). Plus le cercle rouge est grand, plus les intérêts vous coûtent cher au fil du temps. Remarque : Ces calculs sont des estimations très proches ; les banques peuvent utiliser des formules et règles d'arrondi légèrement différentes.",
  'The interest that builds up every 24 hours — money that goes straight to the bank instead of paying down what you owe. Note: Daily accruals can vary slightly based on 365 vs. 360 day conventions.':
    "Les intérêts qui s'accumulent toutes les 24 heures — de l'argent qui va directement à la banque au lieu de réduire ce que vous devez. Note : Le calcul quotidien peut varier selon la convention (365 vs 360 jours).",
  'The remaining loan balance you still owe when your current term contract ends, which you will need to renew or refinance.':
    "Le solde qu'il vous reste à payer à la fin de votre terme actuel, que vous devrez renouveler ou refinancer.",
  'Shows how much of your payment goes to interest versus paying down principal. Over time, as your loan shrinks, more of your payment goes toward actual ownership.':
    'Montre quelle part de votre versement va aux intérêts versus le capital. Plus votre solde diminue, plus votre versement sert à payer votre maison.',
  'A color-coded grid showing how many years you can shave off your loan by combining monthly extra payments (rows) with a one-time cash lump sum (columns). Click any box to try it.':
    "Une grille visuelle montrant combien d'années vous gagnez en combinant des versements mensuels supplémentaires (lignes) et un versement comptant unique (colonnes). Cliquez sur une case pour l'essayer.",
  'Interactive charts tracking your loan balance, equity growth, and payment breakdown over time. You can drag cards to customize your view.':
    "Des graphiques interactifs qui illustrent l'évolution de votre solde, l'accumulation de votre capital et la répartition des versements. Glissez les cartes pour organiser votre tableau de bord.",
  'Visualizes your annual interest payments as a yearly paycheck you hand over to the bank. The circles get smaller as you pay down your debt. Note: Bank interest calculations may vary slightly.':
    'Illustre vos intérêts annuels comme un chèque de paie que vous remettez à la banque chaque année. Les cercles diminuent à mesure que vous remboursez votre dette. Note : Les calculs bancaires peuvent varier légèrement.',
  'A visual timeline celebrating key financial milestones, like paying off 25% of your loan, hitting 50% equity, and your final debt-free date.':
    "Une chronologie visuelle qui souligne vos grandes victoires financières : 25 % remboursé, 50 % d'équité atteinte et la date où vous serez totalement libre de dette.",
  'A complete payment-by-payment schedule showing exactly how much of each payment goes to principal and interest, and your remaining balance. Note: Minor variations can occur due to daily bank rounding.':
    'Le calendrier complet versement par versement montrant exactement ce qui va au capital, aux intérêts et le solde restant. Note : De légères variations peuvent survenir selon les arrondis bancaires.',
  'Opportunity Cost: Mortgage Paydown vs. Market Investing':
    'Coût de renonciation : Rembourser le prêt vs Investir sur les marchés',
  "Trade-off: Paying off debt gives you a guaranteed, risk-free return equal to your loan's interest rate. Investing in the market offers potentially higher returns, but carries market volatility and investment taxes.":
    "Compromis : Rembourser votre dette vous procure un rendement garanti et sans risque équivalent à votre taux d'intérêt. Investir sur les marchés offre des gains potentiellement plus élevés, mais comporte de la volatilité et des impôts.",
  'For every $1.00 borrowed, you pay $0.00 in interest to the bank.':
    "Pour chaque 1,00 $ emprunté, vous payez 0,00 $ d'intérêt à la banque.",

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
  Year: 'Année',
  Years: 'Années',
  'Total Cost': 'Coût total',

  // Trace Series Legends
  Baseline: 'Référence',
  Actual: 'Réel',
  'Term End': 'Fin du terme',
  'Debt Free': 'Libre de dette',
  Interest: 'Intérêts',
  Principal: 'Capital',
  Escrow: 'Frais séquestres',
  Extra: 'Supplément',
  Balance: 'Solde',
  Taxes: 'Taxes',
  Insurance: 'Assurance',
  HOA: 'Condo/HOA',
  PMI: 'PMI',
  'Pay Debt Fast': 'Rembourser rapidement',
  'Invest Surplus': 'Investir les excédents',
  'Debt Free Year': 'Année de libération',

  // Table Headers
  'Date / #': 'Date / N°',
  Payment: 'Versement',
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
  'Lump Sum': 'Versement forfaitaire',
  'Timeline Saved': 'Temps économisé',
  'Apply Strategy': 'Appliquer la stratégie',
  'No Lump Sum': 'Sans versement',
  'No Extra': 'Sans supplément',

  // Nested Label text nodes
  'Interest Saved ': 'Intérêts économisés ',
  '(vs Minimums)': '(vs les minimums)',
  'Interest Saved': 'Intérêts économisés',

  // CMHC Insurance
  'Include CMHC Insurance': "Inclure l'assurance SCHL",
  'CMHC Insurance': 'Assurance SCHL',
  'CMHC Default Insurance': 'Assurance prêt hypothécaire SCHL',
  'Calculate with CMHC Insurance?': 'Calculer avec assurance SCHL ?',
  'CMHC Premium': 'Prime SCHL',
  'Provincial Tax (PST) on Insurance': 'Taxe provinciale (TVP) sur assurance',
  'PST on CMHC (Paid at Closing)': 'TVP sur SCHL (Payable à la clôture)',

  // Land Transfer Tax (LTT)
  'Calculate Land Transfer Tax (LTT)?':
    'Calculer la taxe de bienvenue / droits de mutation (LTT) ?',
  'First-Time Buyer Rebate': 'Remboursement premier acheteur',
  'Region / Municipality': 'Région / Municipalité',
  'Ontario (General PLTT)': 'Ontario (PLTT général)',
  'Ontario - City of Toronto (PLTT + MLTT)': 'Ontario - Ville de Toronto (PLTT + MLTT)',
  'British Columbia (PTT)': 'Colombie-Britannique (PTT)',
  'Alberta (Land Titles Fee)': 'Alberta (Frais de titres de propriété)',
  'Quebec (Taxe de bienvenue)': 'Québec (Taxe de bienvenue)',
  'New South Wales (NSW)': 'Nouvelle-Galles du Sud (NSW)',
  'Victoria (VIC)': 'Victoria (VIC)',
  'England & Northern Ireland (SDLT)': 'Angleterre et Irlande du Nord (SDLT)',
  'Estimated Closing Land Transfer Tax:': 'Droits de mutation estimés à la clôture :',
  'Net Land Transfer Tax (Closing):': 'Taxe de mutation nette (à la clôture) :',
  'UK Stamp Duty (SDLT):': 'Droit de timbre britannique (SDLT) :',
  'Australian Stamp Duty:': 'Droit de mutation australien :',
  'Effective Rate': 'Taux effectif',
  'Effective Rate:': 'Taux effectif :',
  Relief: 'Allégement',
  Concession: 'Concession',
  State: 'État',
  'State:': 'État :',
  Rebate: 'Remboursement',
  Provincial: 'Provincial',
  Municipal: 'Municipal'
};

export const t = (key: string): string => {
  if (activeLanguage === 'en') return key;
  return dictionary[key] || key;
};

const originalTextMap = new WeakMap<Node, string>();
const originalAttrMap = new WeakMap<
  Element,
  { originalPlaceholder?: string; originalTitle?: string; originalAriaLabel?: string }
>();

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
      if (parent.closest && parent.closest('#amortization-table')) {
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
      const orig = originalTextMap.get(node);
      if (orig !== undefined) {
        node.nodeValue = orig;
      }
    });

    // Restore attributes
    const elementsWithAttrs = document.querySelectorAll('[placeholder], [title], [aria-label]');
    elementsWithAttrs.forEach((el) => {
      const htmlEl = el as HTMLElement;
      const cached = originalAttrMap.get(htmlEl);
      if (cached) {
        if (cached.originalPlaceholder !== undefined) {
          htmlEl.setAttribute('placeholder', cached.originalPlaceholder);
        }
        if (cached.originalTitle !== undefined) {
          htmlEl.setAttribute('title', cached.originalTitle);
        }
        if (cached.originalAriaLabel !== undefined) {
          htmlEl.setAttribute('aria-label', cached.originalAriaLabel);
        }
      }
    });
  } else {
    // Translate all text nodes
    walkTextNodes(document.body, (node) => {
      const trimmed = node.nodeValue?.trim() || '';
      const normalizedKey = trimmed.replace(/\s+/g, ' ');
      const translation = dictionary[normalizedKey];
      if (translation) {
        if (!originalTextMap.has(node)) {
          originalTextMap.set(node, node.nodeValue!);
        }
        node.nodeValue = node.nodeValue!.replace(trimmed, translation);
      }
    });

    // Translate attributes
    const elementsWithAttrs = document.querySelectorAll('[placeholder], [title], [aria-label]');
    elementsWithAttrs.forEach((el) => {
      const htmlEl = el as HTMLElement;
      let cached = originalAttrMap.get(htmlEl);
      if (!cached) {
        cached = {};
        originalAttrMap.set(htmlEl, cached);
      }

      const placeholder = htmlEl.getAttribute('placeholder');
      if (placeholder && dictionary[placeholder]) {
        if (cached.originalPlaceholder === undefined) {
          cached.originalPlaceholder = placeholder;
        }
        htmlEl.setAttribute('placeholder', dictionary[placeholder]);
      }
      const title = htmlEl.getAttribute('title');
      if (title && dictionary[title]) {
        if (cached.originalTitle === undefined) {
          cached.originalTitle = title;
        }
        htmlEl.setAttribute('title', dictionary[title]);
      }
      const ariaLabel = htmlEl.getAttribute('aria-label');
      if (ariaLabel && dictionary[ariaLabel]) {
        if (cached.originalAriaLabel === undefined) {
          cached.originalAriaLabel = ariaLabel;
        }
        htmlEl.setAttribute('aria-label', dictionary[ariaLabel]);
      }
    });
  }
};
