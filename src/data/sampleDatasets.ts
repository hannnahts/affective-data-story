import type { Dataset } from '../types/emotion';

export const SAMPLE_DATASETS: Dataset[] = [
  {
    name: 'ChatGPT 用户增长',
    columns: ['月份', '注册用户数(百万)'],
    description: 'ChatGPT 自 2022 年 11 月发布后首 12 个月的月度累计注册用户数（百万）。它是互联网历史上增长最快的消费产品，2 个月内突破 1 亿用户。',
    parsed: [
      { month: 'Nov 22', value: 1 },   { month: 'Dec 22', value: 57 },
      { month: 'Jan 23', value: 100 },  { month: 'Feb 23', value: 116 },
      { month: 'Mar 23', value: 133 },  { month: 'Apr 23', value: 148 },
      { month: 'May 23', value: 180 },  { month: 'Jun 23', value: 200 },
      { month: 'Jul 23', value: 188 },  { month: 'Aug 23', value: 180 },
      { month: 'Sep 23', value: 220 },  { month: 'Oct 23', value: 250 },
    ],
  },
  {
    name: '全球气温偏差',
    columns: ['年份', '温度偏差(℃)'],
    description: '1980–2023 年全球年均地表温度相对于 1951–1980 基准期的偏差值（℃），数据来源：NASA GISS 地表温度分析（GISTEMP）。',
    parsed: [
      { month: '1980', value: 0.27 }, { month: '1985', value: 0.12 },
      { month: '1990', value: 0.44 }, { month: '1995', value: 0.38 },
      { month: '2000', value: 0.42 }, { month: '2005', value: 0.67 },
      { month: '2010', value: 0.72 }, { month: '2015', value: 0.87 },
      { month: '2020', value: 1.02 }, { month: '2023', value: 1.46 },
    ],
  },
  {
    name: '初创企业存活率',
    columns: ['成立年限', '存活率(%)'],
    description: '美国初创企业按成立后年份统计的存活率（%），数据来源：美国劳工统计局（BLS）。反映从创立到持续经营过程中企业数量的自然衰减规律。',
    parsed: [
      { month: 'Y1', value: 100 }, { month: 'Y2', value: 80 },
      { month: 'Y3', value: 65 },  { month: 'Y4', value: 55 },
      { month: 'Y5', value: 50 },  { month: 'Y6', value: 44 },
      { month: 'Y7', value: 40 },  { month: 'Y8', value: 36 },
      { month: 'Y9', value: 32 },  { month: 'Y10', value: 30 },
    ],
  },
  {
    name: '海平面上升趋势',
    columns: ['年份', '偏差(mm)'],
    description: '1993–2023 年全球平均海平面相对基准值的累计偏差（毫米），数据来源：NASA/CNES 卫星测高任务（TOPEX/Jason 系列）。近年上升速率持续加快。',
    parsed: [
      { month: '1993', value: 0 },   { month: '1996', value: 8 },
      { month: '1999', value: 14 },  { month: '2002', value: 22 },
      { month: '2005', value: 31 },  { month: '2008', value: 40 },
      { month: '2011', value: 45 },  { month: '2014', value: 58 },
      { month: '2017', value: 72 },  { month: '2020', value: 88 },
      { month: '2023', value: 101 },
    ],
  },
];
