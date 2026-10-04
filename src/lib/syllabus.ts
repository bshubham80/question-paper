// UGC NET / JRF — Commerce (subject code 08), Paper 2. Standard unit and sub-topic list.

export interface Topic {
  id: string;
  name: string;
}

export interface Unit {
  unit: number;
  name: string;
  topics: Topic[];
}

function unit(n: number, name: string, topics: string[]): Unit {
  const p = `u${String(n).padStart(2, "0")}`;
  return {
    unit: n,
    name,
    topics: topics.map((t, i) => ({ id: `${p}-t${String(i + 1).padStart(2, "0")}`, name: t })),
  };
}

export const SYLLABUS: Unit[] = [
  unit(1, "Business Environment and International Business", [
    "Concepts and elements of business environment",
    "Economic policies: industrial, monetary and fiscal",
    "Political, legal, technological and socio-cultural environment",
    "Corporate social responsibility and ethics",
    "Scope and importance of international business; globalisation; modes of entry",
    "Theories of international trade; tariff and non-tariff barriers; India's foreign trade policy",
    "Foreign investment: FDI and FPI",
    "Regional economic integration and trade agreements",
    "International institutions: IMF, World Bank, WTO, UNCTAD",
    "Balance of payments and foreign exchange market",
  ]),
  unit(2, "Accounting and Auditing", [
    "Accounting principles, concepts and postulates",
    "Partnership accounts: admission, retirement, death, dissolution",
    "Corporate accounting: shares, liquidation, amalgamation, reconstruction, holding companies",
    "Cost accounting: marginal costing, break-even analysis, standard costing, process costing",
    "Management accounting: budgetary control, ABC, target, life-cycle and kaizen costing",
    "Financial statement analysis: ratios, funds flow and cash flow",
    "Human resource, inflation and environmental accounting",
    "Indian Accounting Standards and IFRS",
    "Auditing: vouching, verification, valuation and audit report",
    "Cost audit and recent trends in auditing",
  ]),
  unit(3, "Business Economics", [
    "Meaning, scope and objectives of business firms",
    "Demand analysis: law of demand, elasticity and demand forecasting",
    "Consumer behaviour: utility, indifference curve and revealed preference",
    "Theory of production: production function, variable proportions, returns to scale",
    "Cost and revenue curves",
    "Perfect competition and monopoly",
    "Monopolistic competition and oligopoly",
    "Pricing strategies and practices",
  ]),
  unit(4, "Business Finance", [
    "Scope and sources of finance; lease financing",
    "Time value of money and cost of capital",
    "Capital structure theories",
    "Capital budgeting: techniques, risk and uncertainty",
    "Working capital management",
    "Dividend decisions: theories and policies",
    "Risk and return; asset securitisation",
    "International monetary system and exchange rate risk hedging",
    "International financial markets and instruments (ADR, GDR, Euro-currency)",
    "International arbitrage and multinational capital budgeting",
  ]),
  unit(5, "Business Statistics and Research Methods", [
    "Measures of central tendency, dispersion and skewness",
    "Correlation and regression",
    "Probability and Bayes' theorem",
    "Probability distributions: binomial, Poisson and normal",
    "Research: concept, types and research designs",
    "Data collection, measurement and scaling",
    "Sampling methods and estimation",
    "Hypothesis testing: parametric and non-parametric tests",
    "Multivariate analysis: factor, cluster, discriminant, conjoint",
    "Report writing",
  ]),
  unit(6, "Business Management and Human Resource Management", [
    "Principles and functions of management",
    "Organisation structure, delegation and decentralisation",
    "Motivation: concept and theories",
    "Leadership: concept and theories",
    "Corporate governance and business ethics",
    "HRM concept, functions and human resource planning",
    "Recruitment, selection, training and development",
    "Compensation, incentives and performance appraisal",
    "Industrial relations, trade unions and collective bargaining",
    "Workers' participation, grievance handling and employee welfare",
  ]),
  unit(7, "Banking and Financial Institutions", [
    "Overview of the Indian financial system",
    "Types of banks: commercial, RRBs, cooperative and others",
    "Reserve Bank of India: functions and monetary policy",
    "Banking sector reforms: Basel norms, risk management, NPAs",
    "Financial markets: money, capital and government securities markets",
    "Financial institutions: DFIs, NBFCs, mutual funds, pension funds",
    "Financial regulators in India",
    "Financial sector reforms and financial inclusion",
    "Digitisation of banking and digital payment systems",
    "Insurance: types, principles, IRDAI and ombudsman",
  ]),
  unit(8, "Marketing Management", [
    "Marketing concepts, marketing mix and strategic marketing planning",
    "Segmentation, targeting and positioning",
    "Product decisions: product mix, life cycle and new product development",
    "Pricing decisions: policies and strategies",
    "Promotion decisions: advertising, personal selling and sales promotion",
    "Distribution channels, retailing and wholesaling",
    "Marketing research",
    "Consumer and organisational buying behaviour",
    "Rural, social, online and green marketing; recent developments",
  ]),
  unit(9, "Legal Aspects of Business", [
    "Indian Contract Act, 1872: essentials, void/voidable agreements, discharge, breach",
    "Special contracts: indemnity, guarantee, bailment, pledge and agency",
    "Sale of Goods Act, 1930",
    "Negotiable Instruments Act, 1881",
    "Companies Act, 2013",
    "Limited Liability Partnership Act, 2008",
    "Competition Act, 2002 and Consumer Protection Act, 2019",
    "Information Technology Act, 2000 and intellectual property rights",
    "Goods and Services Tax (GST)",
    "Foreign Exchange Management Act, 1999",
  ]),
  unit(10, "Income Tax and Corporate Tax Planning", [
    "Basic concepts, residential status and incidence of tax",
    "Exempt incomes and agricultural income",
    "Income from salaries",
    "Income from house property",
    "Profits and gains of business or profession",
    "Capital gains",
    "Income from other sources; clubbing; set-off and carry forward of losses",
    "Deductions and computation of tax liability of individuals and firms",
    "Corporate tax planning; tax avoidance vs tax evasion",
    "Returns, TDS, advance tax and assessment",
  ]),
];

export function getUnit(n: number): Unit | undefined {
  return SYLLABUS.find((u) => u.unit === n);
}

export function getTopic(id: string): (Topic & { unit: number }) | undefined {
  for (const u of SYLLABUS) {
    const t = u.topics.find((t) => t.id === id);
    if (t) return { ...t, unit: u.unit };
  }
  return undefined;
}
