'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { crawlApi, CrawlDigest } from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import { NewsletterSummaryNewspaper } from '@/components/NewsletterSummaryNewspaper';

// Hardcoded DOE newsletter data (same as in newsletters page)
const HARDCODED_DOE_NEWSLETTER: CrawlDigest = {
    id: 'doe-hardcoded-001',
    crawl_job_id: 'hardcoded-job',
    source_id: 'doe-source',
    summary_markdown: `# DOE Circulars – Recent Policy & Regulatory Updates

The Department of Energy (DOE) has recently issued several circulars and advisories aimed at enhancing regulatory compliance and promoting sustainable energy practices in the Philippines. Key themes include the recognition and classification of electric vehicles (EVs), updates to the Green Energy Auction Program (GEAP), and the integration of nuclear energy into the country's power generation mix. These documents reflect the DOE's commitment to fostering a cleaner energy landscape while ensuring adherence to international standards.

The advisories and circulars emphasize the importance of compliance among industry participants, particularly in the LPG and marine fuel sectors, and outline the necessary steps for registration and licensing. The integration of nuclear energy is positioned as a critical component of the Philippines' long-term energy strategy, aiming to bolster energy security and sustainability.

## Key Policy Areas

### Electric Vehicle Recognition
The DOE has issued advisories reiterating compliance requirements for road transport vehicle manufacturers, assemblers, importers, and rebuilders (MAIRs) regarding the recognition and adoption of electric vehicles (EVs). The advisory references Department Circular No. DC2021-11-0036, which outlines the application process for EV recognition, including fees, types of EVs, and guidelines for submissions.

### Green Energy Auction Program (GEAP)
Multiple circulars address amendments to the Green Energy Auction Program guidelines, particularly focusing on the indexation of renewable energy sources and the integration of the Green Energy Tariff (GET) with the Feed-in Tariff (FIT) Rules. These updates aim to attract renewable energy investments and establish a framework for the adjustment of GETs.

### LPG Industry Training & Compliance
Notices to All LPG Industry Participants emphasize that only training certificates issued by DOE-recognized training organizations will be accepted for registration and licensing. This ensures standardized training and safety in the sector, with a list of recognized training organizations provided.

### Marine Fuel Regulations
Department Circulars provide guidelines for marine fuel bunker tankers to comply with MARINA regulations and international standards. Additionally, specifications for marine fuels are prescribed to ensure environmental protection and quality assurance in maritime operations.

### Nuclear Energy Integration
The DOE has outlined a policy framework for integrating nuclear energy into the Philippines' power generation mix as part of the Clean Energy Scenario under the Philippine Energy Plan 2023-2050. This initiative aims to enhance energy security, environmental sustainability, and competitive pricing.

### Wholesale Electricity Spot Market (WESM) Rules
Updates to WESM Rules and Manuals address dispatch protocol and market surveillance, enhancing the roles of the System Operator and Market Operator during market intervention or suspension, in compliance with the Electric Power Industry Reform Act (EPIRA).

## Why This Matters

- **EV Recognition**: Promotes the adoption of electric vehicles, contributing to environmental sustainability and compliance with EVIDA
- **Green Energy Investments**: Amendments to GEAP enhance the framework for renewable energy development, supporting the Philippines' transition to cleaner energy sources
- **LPG Safety**: Training certificate requirements ensure standardized training and safety in the sector
- **Marine Fuel Standards**: Compliance guidelines align with international standards, ensuring environmental protection in maritime operations
- **Nuclear Energy Strategy**: Integration of nuclear energy is a significant step towards diversifying the energy mix and enhancing energy security
- **Market Efficiency**: WESM updates improve market intervention procedures, enhancing system reliability and compliance

## What to Watch Next

- Implementation of training certificate requirements for LPG participants and impact on industry compliance
- Progress in the recognition and adoption of electric vehicles under the EVIDA framework
- Updates on the Green Energy Auction Program and its effectiveness in attracting renewable energy investments
- Monitoring compliance with marine fuel specifications and impact on maritime operations
- Developments in the integration of nuclear energy and its implications for the Philippine energy landscape`,
    summary_markdown_path: null,
    highlights: [
        {
            title: 'Notice to All LPG Industry Participants',
            summary: 'The DOE announces that only training certificates issued by DOE-recognized training organizations will be accepted for registration and licensing of LPG industry participants effective July 1, 2025. A list of recognized training organizations is provided.',
            category: 'Advisory',
            documentId: 'doc-001',
            effectiveDate: '2025-07-01'
        },
        {
            title: 'Electric Vehicle (EV) Recognition Advisory',
            summary: 'This advisory reiterates the compliance requirements for road transport vehicle manufacturers, assemblers, importers, and rebuilders (MAIRs) regarding the recognition and adoption of EV standard vehicles. References Department Circular No. DC2021-11-0036 (EVIDA). It outlines the application process for EV recognition, including fees, types of EVs, and guidelines for submissions.',
            category: 'Advisory',
            documentId: 'doc-002',
            effectiveDate: '2025-06-27'
        },
        {
            title: 'Amendment to Department Circular No. DC2021-11-0036 (Green Energy Auction Program)',
            summary: 'This circular amends the guidelines for the Green Energy Auction Program (GEAP) in the Philippines, addressing the indexation of renewable energy sources and the integration of the Green Energy Tariff (GET) as per the Feed-in Tariff (FIT) Rules.',
            category: 'Department Circular',
            documentId: 'doc-003',
            effectiveDate: '2025-03-06'
        },
        {
            title: 'Guidelines for Compliance of Marine Fuel Bunker Tankers',
            summary: 'This circular provides guidelines for marine fuel bunker tankers to comply with the MARINA rules after July 01, 2025 for Philippine-registered ships in compliance with the 2020-06 Titled "Rules and Regulations on the Mandatory Use of Fuel Oil with Sulphur Limit of Fuel Oil for All Philippine Registered Ships in Compliance with Annex VI of MARPOL 73/78, As Amended".',
            category: 'Department Circular',
            documentId: 'doc-004',
            effectiveDate: '2025-01-26'
        },
        {
            title: 'Prescribing the Specifications for Marine Fuels',
            summary: 'This circular prescribes the specifications for marine fuels sold in the Philippines, mandating compliance with PNS ISO 8217:2024 standards. It includes provisions for quality monitoring and penalties for non-compliance.',
            category: 'Department Circular',
            documentId: 'doc-005',
            effectiveDate: '2025-01-26'
        },
        {
            title: 'Amendments to the Wholesale Electricity Spot Market (WESM) Rules and Manuals',
            summary: 'This circular provides amendments to the Wholesale Electricity Spot Market (WESM) Rules and WESM Manuals on Dispatch Protocol and Market Surveillance Regarding Refinements to Procedures During Market Intervention/Market Suspension, enhancing the roles of the System Operator and Market Operator, and ensuring compliance with the Electric Power Industry Reform Act (EPIRA).',
            category: 'Department Circular',
            documentId: 'doc-006',
            effectiveDate: '2025-02-01'
        },
        {
            title: 'Amendment to Department Circular No. DC2024-03-0004 (Green Energy Auction Program)',
            summary: 'This circular provides amendments to Department Circular No. DC2024-03-0004 in the Philippines, carrying the indexation of the Green Energy Tariff (GET) for renewable energy sources. It establishes a framework for the adjustment of GETs and incorporates provisions from the Feed-in Tariff (FIT) Rules.',
            category: 'Department Circular',
            documentId: 'doc-007',
            effectiveDate: '2025-06-09'
        },
        {
            title: 'Framework for the Integration of Nuclear Energy',
            summary: 'This circular outlines the policy framework for the integration of nuclear energy into the Philippines\' power generation mix, aiming to support the Clean Energy Scenario under the Philippine Energy Plan 2023-2050. It establishes guidelines for the commercial development of nuclear power plants and serves to guide the roles of various government agencies in facilitating this integration.',
            category: 'Department Circular',
            documentId: 'doc-008',
            effectiveDate: '2025-01-01'
        }
    ],
    datapoints: [
        {
            indicatorCode: 'EV_COMPLIANCE_DATE',
            description: 'Effective date for EV recognition compliance requirements',
            value: '2025-06-27',
            effectiveDate: '2025-06-27',
            country: 'PH',
            sourceDocumentId: 'doc-ev-001',
            sourceUrl: 'https://www.doe.gov.ph/department-circulars'
        },
        {
            indicatorCode: 'LPG_TRAINING_REQUIREMENT',
            description: 'Date when only DOE-recognized training certificates will be accepted for LPG licensing',
            value: '2025-07-01',
            effectiveDate: '2025-07-01',
            country: 'PH',
            sourceDocumentId: 'doc-lpg-001',
            sourceUrl: 'https://www.doe.gov.ph/department-circulars'
        },
        {
            indicatorCode: 'GEAP_AMENDMENT_DATE',
            description: 'Effective date for Green Energy Auction Program amendments',
            value: '2025-03-06',
            effectiveDate: '2025-03-06',
            country: 'PH',
            sourceDocumentId: 'doc-geap-001',
            sourceUrl: 'https://www.doe.gov.ph/department-circulars'
        },
        {
            indicatorCode: 'MARINE_FUEL_STANDARD',
            description: 'Marine fuel specification standard',
            value: 'PNS ISO 8217:2024',
            effectiveDate: '2025-01-26',
            country: 'PH',
            sourceDocumentId: 'doc-marine-spec-001',
            sourceUrl: 'https://www.doe.gov.ph/department-circulars'
        },
        {
            indicatorCode: 'NUCLEAR_ENERGY_PLAN',
            description: 'Nuclear energy integration timeline under Philippine Energy Plan',
            value: '2023-2050',
            effectiveDate: '2025-01-01',
            country: 'PH',
            sourceDocumentId: 'doc-nuclear-001',
            sourceUrl: 'https://www.doe.gov.ph/department-circulars'
        },
        {
            indicatorCode: 'WESM_UPDATE_DATE',
            description: 'Effective date for WESM Rules amendments on market intervention',
            value: '2025-02-01',
            effectiveDate: '2025-02-01',
            country: 'PH',
            sourceDocumentId: 'doc-wesm-001',
            sourceUrl: 'https://www.doe.gov.ph/department-circulars'
        }
    ],
    metadata: {
        source_name: 'Department of Energy',
        source_url: 'https://www.doe.gov.ph/department-circulars',
        country: 'Philippines',
        sector: 'Energy'
    },
    period_start: '2025-11-25T00:00:00Z',
    period_end: '2025-12-02T00:00:00Z',
    created_at: '2025-12-02T02:30:00Z',
    updated_at: '2025-12-02T02:30:00Z'
};

const HARDCODED_DOE_LAWS_NEWSLETTER: CrawlDigest = {
    id: 'cc19c065-cb14-4e35-a4e4-5fb5e6497f7a',
    crawl_job_id: '663833c9-bb4b-4d02-ac3f-adc88745ee2d',
    source_id: '93498e3f-38b0-498f-bcd9-a3f7027a6ed0',
    summary_markdown: `# DOE Laws & Issuances - Policy & Data Digest

The Department of Energy (DOE) has recently issued several significant circulars and resolutions aimed at enhancing energy efficiency, regulating petroleum service contracts, and clarifying the legal frameworks surrounding energy-related projects. Notably, the Inter-Agency Energy Efficiency and Conservation Committee (IAEECC) has mandated that all government entities comply with the Minimum Energy Performance of Products (MEPP) under the Philippine Energy Labeling Program (PELP). This initiative is expected to significantly improve energy efficiency across government operations.

Additionally, the joint circulars between the DOE and the Department of Public Works and Highways (DPWH) provide comprehensive guidelines for the relocation of electric poles affected by government projects, as well as for energy-related projects. These developments reflect the government's commitment to sustainable energy practices and the efficient management of energy resources.`,
    summary_markdown_path: null,
    highlights: [
        {
            title: 'IAEECC Resolution No. 11 s. 2025',
            summary: 'This resolution mandates all government entities to utilize energy-consuming products (ECPs) in alignment with the MEPP under the PELP. This initiative is designed to enhance energy efficiency across government operations.',
            category: 'Regulatory',
            documentId: 'doc-doe-laws-001',
            sourceUrl: 'https://doe.gov.ph/articles/3115350--inter-agency-energy-efficiency-and-conservation-committee-iaeecc-resolution-no-11-s-2025-1'
        },
        {
            title: 'Resolution No. 03-001 s. 2025',
            summary: 'This resolution recommends the adoption of the Model Development and Production Petroleum Service Contract (DP PSC), which builds upon the Philippine Conventional Energy Contracting Program (PCECP) established in 2017.',
            category: 'Regulatory',
            documentId: 'doc-doe-laws-002',
            sourceUrl: 'https://doe.gov.ph/articles/2115164--resolution-no-03-001-s-2025'
        },
        {
            title: 'Joint Circular No. 4 Series of 2025 (DOE & DPWH)',
            summary: 'This circular outlines policies governing the relocation and payment of electric poles/facilities owned by electric cooperatives that are affected by government projects, enhancing the framework established in 2017.',
            category: 'Regulatory',
            documentId: 'doc-doe-laws-003',
            sourceUrl: 'https://doe.gov.ph/articles/2113112--joint-circular-of-the-department-of-energy-doe-and-the-department-of-public-works-and-highways-dpwh-no-4-series-of-2025'
        },
        {
            title: 'Memorandum Circular No. 162, s. 2024',
            summary: 'This circular asserts the Philippines\' historical and legal rights over parts of North Borneo (Sabah) as per the 1987 Philippine Constitution.',
            category: 'Policy Announcement',
            documentId: 'doc-doe-laws-004',
            sourceUrl: 'https://doe.gov.ph/articles/group/laws-and-issuances?category=Laws&display_type=Card'
        },
        {
            title: 'Special Order No. SO2025-08-0045',
            summary: 'This order details the reassignment of personnel within the DOE\'s Accounting Division to strengthen internal control systems, thereby enhancing service efficiency.',
            category: 'Administrative',
            documentId: 'doc-doe-laws-005',
            sourceUrl: 'https://doe.gov.ph/articles/group/laws-and-issuances?category=Issuances&display_type=Card'
        },
        {
            title: 'Joint Memorandum Circular No. JMC2024-12-001',
            summary: 'This circular provides guidelines for local government units (LGUs) regarding the preferential rights of electric cooperatives under relevant Republic Acts, clarifying the legal framework for LGUs.',
            category: 'Regulatory',
            documentId: 'doc-doe-laws-006',
            sourceUrl: 'https://doe.gov.ph/articles/group/laws-and-issuances?category=Issuances&display_type=Card'
        },
        {
            title: 'Implementing Guidelines of the Philippine Transport Vehicles Fuel Economy Labeling Program',
            summary: 'These guidelines implement the Fuel Economy Labeling Program for road transport vehicles, providing compliance requirements for the transport sector.',
            category: 'Regulatory',
            documentId: 'doc-doe-laws-007',
            sourceUrl: 'https://doe.gov.ph/articles/group/laws-and-issuances?category=Issuances&display_type=Card'
        },
        {
            title: 'Department Circular No. DC2020-12-0025',
            summary: 'This circular implements the Philippine National Standard Specification for Kerosene, ensuring quality and safety standards in the kerosene supply chain.',
            category: 'Regulatory',
            documentId: 'doc-doe-laws-008',
            sourceUrl: 'https://doe.gov.ph/articles/group/laws-and-issuances?category=Issuances&display_type=Card'
        }
    ],
    datapoints: [
        {
            indicatorCode: 'DOE_CIRCULAR',
            description: 'JMC2024-12-001 - Joint Memorandum Circular No. JMC2024-12-001',
            value: 'JMC2024-12-001',
            effectiveDate: '2025-12-03',
            country: 'PH',
            sourceDocumentId: 'doc-doe-laws-006',
            sourceUrl: 'https://doe.gov.ph/articles/group/laws-and-issuances'
        },
        {
            indicatorCode: 'DOE_CIRCULAR',
            description: 'DC2020-12-0025 - Department Circular No. DC2020-12-0025',
            value: 'DC2020-12-0025',
            effectiveDate: '2025-12-03',
            country: 'PH',
            sourceDocumentId: 'doc-doe-laws-008',
            sourceUrl: 'https://doe.gov.ph/articles/group/laws-and-issuances'
        }
    ],
    metadata: {
        source_name: 'DOE Laws & Issuances',
        source_url: 'https://doe.gov.ph/articles/group/laws-and-issuances',
        country: 'Philippines',
        sector: 'Energy'
    },
    period_start: '2025-11-26T00:00:00Z',
    period_end: '2025-12-03T00:00:00Z',
    created_at: '2025-12-03T00:00:00Z',
    updated_at: '2025-12-03T00:00:00Z'
};

// Hardcoded Combined News Intelligence newsletter data  
const HARDCODED_NEWS_NEWSLETTER: CrawlDigest = {
    id: 'combined-news-2025-12-05',
    crawl_job_id: 'combined-news-job',
    source_id: 'combined-sources',
    summary_markdown: `# Combined News Intelligence - Energy & Business Update

## Executive Summary
This combined intelligence digest synthesizes recent developments from **Power Philippines** and **BusinessWorld**, covering the Philippine energy sector and related business news from late November through early December 2025. Key themes include renewable energy expansion, infrastructure partnerships, corporate M&A activity, and utility financial performance.

**Renewable Energy Expansion**: ACEN Corp. is acquiring Sinocalan Solar Power Corp., developer of a 60 MWp solar farm in Pangasinan, strengthening its clean energy portfolio. Separately, Repower Energy Development Corporation (REDC) acquired a 95% stake in Maramag Hydropower Corporation, advancing the 25 MW Pulangi IV hydroelectric project in Bukidnon.

**Strategic Partnerships**: Aseana Holdings Inc. partnered with MPower to enroll six properties in the Retail Aggregation Program (RAP), enabling competitive energy procurement. The National Electrification Administration (NEA) is collaborating with Maharlika Investment Corporation and Palawan Province to enhance the island's electrical infrastructure.

**Financial Performance**: Manila Water Co. reported first-quarter net income of PHP 2.28 billion, more than doubling year-over-year, with revenues increasing 48.6% to PHP 7.38 billion.

**Market Dynamics**: Analysis shows midday electricity prices declining due to increased solar supply. The spot market price averaged PHP 4.50 in H1 2025. Looking forward, the Philippines targets 2,000 MW of wind capacity by 2030, while facing a projected 220,000-worker green-skills gap.`,
    summary_markdown_path: null,
    highlights: [
        // Power Philippines highlights
        {
            title: 'AHI partners with MPower for Retail Aggregation Program',
            summary: 'Aseana Holdings Inc. (AHI) has partnered with MPower to enroll six properties in Aseana City into the Retail Aggregation Program (RAP), enabling them to consolidate accounts for competitive energy sourcing.',
            category: 'Partnership',
            documentId: '4d0ed0a5-2581-4d20-95e3-e696fb7e3ba3',
            sourceUrl: 'https://powerphilippines.com/ahi-partners-with-mpower-to-shift-aseana-city-accounts-to-retail-aggregation-program/',
            effectiveDate: undefined,
            metadata: { source: 'Power Philippines' }
        },
        {
            title: 'NEA, Maharlika Investment Corporation, and Palawan Province partner on electrification',
            summary: 'The National Electrification Administration (NEA) is partnering with the Maharlika Investment Corporation and the Provincial Government of Palawan to enhance the island\'s electrical infrastructure.',
            category: 'Infrastructure',
            documentId: '18c6d4ad-ddd1-478b-a4cc-cf741ad4b139',
            sourceUrl: 'https://powerphilippines.com/',
            effectiveDate: undefined,
            metadata: { source: 'Power Philippines' }
        },
        {
            title: 'REDC acquires Maramag Hydropower for 25 MW project',
            summary: 'Repower Energy Development Corporation (REDC) acquired a 95% stake in Maramag Hydropower Corporation, which is developing the 25 MW Pulangi IV hydroelectric project in Bukidnon.',
            category: 'Renewable Energy',
            documentId: '18c6d4ad-ddd1-478b-a4cc-cf741ad4b139',
            sourceUrl: 'https://powerphilippines.com/',
            effectiveDate: undefined,
            metadata: { source: 'Power Philippines' }
        },
        {
            title: 'ERC approves 115-kV facility for Prime Solar',
            summary: 'The Energy Regulatory Commission (ERC) approved Prime Solar Solutions Corp. to establish a 115-kV dedicated point-to-point limited transmission facility for the Maragondon Solar Power Plant.',
            category: 'Regulatory',
            documentId: '18c6d4ad-ddd1-478b-a4cc-cf741ad4b139',
            sourceUrl: 'https://powerphilippines.com/',
            effectiveDate: undefined,
            metadata: { source: 'Power Philippines' }
        },
        {
            title: 'DASURECO receives approval for grid safety upgrades',
            summary: 'The Energy Regulatory Commission approved Davao del Sur Electric Cooperative\'s capital expenditure projects totaling PHP 84.54 million to address capacity strain and ensure grid safety.',
            category: 'Infrastructure',
            documentId: '18c6d4ad-ddd1-478b-a4cc-cf741ad4b139',
            sourceUrl: 'https://powerphilippines.com/',
            effectiveDate: undefined,
            metadata: { source: 'Power Philippines' }
        },
        {
            title: 'Solar supply driving midday power prices down',
            summary: 'Analysis shows midday electricity prices in the Philippines are declining rapidly due to increased solar energy supply.',
            category: 'Market Analysis',
            documentId: '9ba388ea-a3fc-4e83-b6fc-1c88afa5b83d',
            sourceUrl: 'https://powerphilippines.com/category/market-insights/',
            effectiveDate: undefined,
            metadata: { source: 'Power Philippines' }
        },
        {
            title: 'Green Jobs Forum addresses workforce development',
            summary: 'The PERPI Green Jobs Forum emphasized the role of emerging technologies like hydrogen and agrivoltaics in creating green jobs, addressing a projected 220,000-worker green-skills gap by 2030.',
            category: 'Workforce',
            documentId: 'edc496ca-99d0-4084-a83d-456a34a36b6d',
            sourceUrl: 'https://powerphilippines.com/from-hydrogen-to-agrivoltaics-emerging-technologies-drive-the-philippines-green-workforce/',
            effectiveDate: undefined,
            metadata: { source: 'Power Philippines' }
        },
        // BusinessWorld highlights
        {
            title: 'ACEN signs deal to acquire solar farm developer in Pangasinan',
            summary: 'ACEN Corp. is acquiring Sinocalan Solar Power Corp., a developer of a 60 MWp solar power plant in Pangasinan, strengthening its renewable energy portfolio and supporting the Philippines\' clean energy goals.',
            category: 'Corporate M&A',
            documentId: 'f66ccacb-1176-499d-be5c-488dc03d7bd7',
            sourceUrl: 'https://www.bworldonline.com/corporate/2022/12/02/490679/acen-signs-deal-to-acquire-solar-farm-developer-in-pangasinan/',
            effectiveDate: undefined,
            metadata: { source: 'BusinessWorld' }
        },
        {
            title: 'Manila Water income more than doubles',
            summary: 'Manila Water Co., Inc. reported first-quarter attributable net income of PHP 2.28 billion, more than doubling from PHP 1.09 billion the previous year, driven by a 48.6% increase in revenues to PHP 7.38 billion.',
            category: 'Corporate Earnings',
            documentId: '04d14e35-8732-41c4-9839-fdfeaec2299d',
            sourceUrl: 'https://www.bworldonline.com/corporate/2023/05/12/522442/manila-water-income-more-than-doubles/',
            effectiveDate: undefined,
            metadata: { source: 'BusinessWorld' }
        }
    ],
    datapoints: [
        // Power Philippines datapoints
        {
            indicatorCode: 'HYDRO_PROJECT_CAPACITY',
            description: 'Pulangi IV hydroelectric project capacity',
            value: '25',
            unit: 'MW',
            effectiveDate: undefined,
            country: 'Philippines',
            sourceDocumentId: '18c6d4ad-ddd1-478b-a4cc-cf741ad4b139',
            sourceUrl: 'https://powerphilippines.com/',
        },
        {
            indicatorCode: 'SOLAR_PROJECT_CAPACITY',
            description: 'Maragondon Solar Power Plant capacity',
            value: '48.118',
            unit: 'MWac',
            effectiveDate: undefined,
            country: 'Philippines',
            sourceDocumentId: '18c6d4ad-ddd1-478b-a4cc-cf741ad4b139',
            sourceUrl: 'https://powerphilippines.com/',
        },
        {
            indicatorCode: 'SPOT_MARKET_PRICE',
            description: 'Average spot market price in H1 2025',
            value: '4.50',
            unit: 'PHP',
            effectiveDate: undefined,
            country: 'Philippines',
            sourceDocumentId: '9ba388ea-a3fc-4e83-b6fc-1c88afa5b83d',
            sourceUrl: 'https://powerphilippines.com/category/market-insights/',
        },
        {
            indicatorCode: 'WIND_CAPACITY',
            description: 'Projected wind energy capacity by 2030',
            value: '2000',
            unit: 'MW',
            effectiveDate: '2030',
            country: 'Philippines',
            sourceDocumentId: 'edc496ca-99d0-4084-a83d-456a34a36b6d',
            sourceUrl: 'https://powerphilippines.com/from-hydrogen-to-agrivoltaics-emerging-technologies-drive-the-philippines-green-workforce/',
        },
        {
            indicatorCode: 'GREEN_SKILLS_GAP',
            description: 'Projected green-skills workforce gap by 2030',
            value: '220000',
            unit: 'workers',
            effectiveDate: '2030',
            country: 'Philippines',
            sourceDocumentId: 'edc496ca-99d0-4084-a83d-456a36b6d',
            sourceUrl: 'https://powerphilippines.com/from-hydrogen-to-agrivoltaics-emerging-technologies-drive-the-philippines-green-workforce/',
        },
        // BusinessWorld datapoints
        {
            indicatorCode: 'SOLAR_PROJECT_CAPACITY',
            description: 'Sinocalan Solar Power Plant capacity in Pangasinan',
            value: '60',
            unit: 'MWp',
            effectiveDate: '2022',
            country: 'Philippines',
            sourceDocumentId: 'f66ccacb-1176-499d-be5c-488dc03d7bd7',
            sourceUrl: 'https://www.bworldonline.com/corporate/2022/12/02/490679/acen-signs-deal-to-acquire-solar-farm-developer-in-pangasinan/',
        },
        {
            indicatorCode: 'NET_INCOME',
            description: 'Manila Water Q1 attributable net income',
            value: '2.28',
            unit: 'billion PHP',
            effectiveDate: '2023-Q1',
            country: 'Philippines',
            sourceDocumentId: '04d14e35-8732-41c4-9839-fdfeaec2299d',
            sourceUrl: 'https://www.bworldonline.com/corporate/2023/05/12/522442/manila-water-income-more-than-doubles/',
        },
        {
            indicatorCode: 'REVENUE',
            description: 'Manila Water Q1 revenues',
            value: '7.38',
            unit: 'billion PHP',
            effectiveDate: '2023-Q1',
            country: 'Philippines',
            sourceDocumentId: '04d14e35-8732-41c4-9839-fdfeaec2299d',
            sourceUrl: 'https://www.bworldonline.com/corporate/2023/05/12/522442/manila-water-income-more-than-doubles/',
        },
        {
            indicatorCode: 'REVENUE_GROWTH',
            description: 'Manila Water year-over-year revenue growth',
            value: '48.6',
            unit: '%',
            effectiveDate: '2023-Q1',
            country: 'Philippines',
            sourceDocumentId: '04d14e35-8732-41c4-9839-fdfeaec2299d',
            sourceUrl: 'https://www.bworldonline.com/corporate/2023/05/12/522442/manila-water-income-more-than-doubles/',
        }
    ],
    metadata: {
        source_name: 'Combined News Intelligence (Power Philippines + BusinessWorld)',
        source_url: 'https://powerphilippines.com/, https://www.bworldonline.com/',
        country: 'Philippines',
        sector: 'Energy & Business'
    },
    period_start: '2025-11-27T00:00:00Z',
    period_end: '2025-12-05T00:00:00Z',
    created_at: '2025-12-05T00:00:00Z',
    updated_at: '2025-12-05T00:00:00Z'
};

export default function NewsletterDetailPage(): JSX.Element {
    const params = useParams();
    const jobId = params?.jobId as string;

    const [digest, setDigest] = useState<CrawlDigest | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'summary' | 'highlights' | 'datapoints'>('summary');

    useEffect(() => {
        if (jobId) {
            loadNewsletter();
        }
    }, [jobId]);

    const loadNewsletter = async () => {
        try {
            setLoading(true);
            setError(null);

            // Check if it's one of the hardcoded newsletters (by id or crawl_job_id)
            if (jobId === 'doe-hardcoded-001' || jobId === 'hardcoded-job') {
                setDigest(HARDCODED_DOE_NEWSLETTER);
            } else if (jobId === 'cc19c065-cb14-4e35-a4e4-5fb5e6497f7a' || jobId === '663833c9-bb4b-4d02-ac3f-adc88745ee2d') {
                setDigest(HARDCODED_DOE_LAWS_NEWSLETTER);
            } else if (jobId === 'combined-news-2025-12-05' || jobId === 'combined-news-job') {
                setDigest(HARDCODED_NEWS_NEWSLETTER);
            } else {
                // Try to get digest by crawl_job_id (API expects this)
                const data = await crawlApi.getDigest(jobId);
                setDigest(data);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load newsletter');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string): string => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#202020]"></div>
                    <p className="mt-4 text-[#666666]">Loading newsletter...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#FAFAFA]">
                <div className="max-w-4xl mx-auto px-6 py-8">
                    <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-sm text-red-800">{error}</p>
                    </div>
                    <Link href="/newsletters" className="mt-4 inline-block text-blue-600 hover:underline">
                        ← Back to Newsletters
                    </Link>
                </div>
            </div>
        );
    }

    if (!digest) {
        return (
            <div className="min-h-screen bg-[#FAFAFA]">
                <div className="max-w-4xl mx-auto px-6 py-8">
                    <p className="text-[#666666]">Newsletter not found</p>
                    <Link href="/newsletters" className="mt-4 inline-block text-blue-600 hover:underline">
                        ← Back to Newsletters
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FAFAFA]">
            <div className="max-w-5xl mx-auto px-8 py-12">
                {/* Header */}
                <div className="mb-8">
                    <Link href="/newsletters" className="text-blue-600 hover:underline text-sm mb-4 inline-block">
                        ← Back to Newsletters
                    </Link>
                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-4xl font-bold text-[#202020] mb-2">Policy Newsletter</h1>
                            <p className="text-[#666666] text-base">
                                {formatDate(digest.period_start)} - {formatDate(digest.period_end)}
                            </p>
                        </div>
                        <div className="text-right text-sm">
                            <div className="text-[#202020] font-medium">{digest.highlights.length} Highlights</div>
                            <div className="text-[#727272]">{digest.datapoints.length} Datapoints</div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-[#E5E5E5] mb-6">
                    <nav className="flex gap-6">
                        <button
                            onClick={() => setActiveTab('summary')}
                            className={`pb-3 border-b-2 font-medium text-sm transition ${activeTab === 'summary'
                                    ? 'border-[#202020] text-[#202020]'
                                    : 'border-transparent text-[#727272] hover:text-[#202020]'
                                }`}
                        >
                            Summary
                        </button>
                        <button
                            onClick={() => setActiveTab('highlights')}
                            className={`pb-3 border-b-2 font-medium text-sm transition ${activeTab === 'highlights'
                                    ? 'border-[#202020] text-[#202020]'
                                    : 'border-transparent text-[#727272] hover:text-[#202020]'
                                }`}
                        >
                            Highlights ({digest.highlights.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('datapoints')}
                            className={`pb-3 border-b-2 font-medium text-sm transition ${activeTab === 'datapoints'
                                    ? 'border-[#202020] text-[#202020]'
                                    : 'border-transparent text-[#727272] hover:text-[#202020]'
                                }`}
                        >
                            Datapoints ({digest.datapoints.length})
                        </button>
                    </nav>
                </div>

                {/* Content */}
                {activeTab === 'summary' ? (
                    <NewsletterSummaryNewspaper
                        digest={digest}
                        newsletterTitle="Policy Newsletter"
                        dateRange={`${formatDate(digest.period_start)} - ${formatDate(digest.period_end)}`}
                    />
                ) : (
                    <div className="bg-white rounded-lg shadow-sm border border-[#E5E5E5] p-8">
                        {/* Highlights Tab */}
                        {activeTab === 'highlights' && (
                            <div className="space-y-6">
                                {digest.highlights.map((highlight, idx) => (
                                    <div key={idx} className="border-l-4 border-[#202020] pl-4">
                                        <div className="flex items-start justify-between mb-2">
                                            <h3 className="font-semibold text-[#202020]">{highlight.title}</h3>
                                            <div className="flex items-center gap-2">
                                                {highlight.metadata?.source && (
                                                    <span className={`px-2 py-0.5 text-xs rounded ${highlight.metadata.source === 'Power Philippines'
                                                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                                            : 'bg-green-50 text-green-700 border border-green-200'
                                                        }`}>
                                                        {highlight.metadata.source}
                                                    </span>
                                                )}
                                                <span className="px-2 py-0.5 bg-[#FAFAFA] text-xs text-[#727272] rounded">
                                                    {highlight.category}
                                                </span>
                                            </div>
                                        </div>
                                        <p className="text-sm text-[#727272] mb-2">{highlight.summary}</p>
                                        <div className="flex items-center gap-4">
                                            {highlight.effectiveDate && (
                                                <p className="text-xs text-[#727272]">
                                                    Effective: {formatDate(highlight.effectiveDate)}
                                                </p>
                                            )}
                                            {highlight.sourceUrl && (
                                                <a
                                                    href={highlight.sourceUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                                >
                                                    View Document →
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {digest.highlights.length === 0 && (
                                    <p className="text-[#727272] text-center py-8">No highlights found</p>
                                )}
                            </div>
                        )}

                        {/* Datapoints Tab */}
                        {activeTab === 'datapoints' && (
                            <div className="space-y-4">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-[#E5E5E5]">
                                                <th className="text-left py-2 px-3 font-medium text-[#202020]">Indicator</th>
                                                <th className="text-left py-2 px-3 font-medium text-[#202020]">Description</th>
                                                <th className="text-left py-2 px-3 font-medium text-[#202020]">Value</th>
                                                <th className="text-left py-2 px-3 font-medium text-[#202020]">Date</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {digest.datapoints.map((dp, idx) => (
                                                <tr key={idx} className="border-b border-[#E5E5E5] hover:bg-[#FAFAFA]">
                                                    <td className="py-3 px-3">
                                                        <code className="text-xs bg-[#EFEFEF] px-2 py-1 rounded">
                                                            {dp.indicatorCode}
                                                        </code>
                                                    </td>
                                                    <td className="py-3 px-3 text-[#727272]">{dp.description}</td>
                                                    <td className="py-3 px-3 font-medium">
                                                        {dp.value} {dp.unit && <span className="text-[#727272] text-xs">{dp.unit}</span>}
                                                    </td>
                                                    <td className="py-3 px-3 text-[#727272] text-xs">
                                                        {dp.effectiveDate ? formatDate(dp.effectiveDate) : '-'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {digest.datapoints.length === 0 && (
                                    <p className="text-[#727272] text-center py-8">No datapoints extracted</p>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Download Markdown */}
                {digest.summary_markdown_path && (
                    <div className="mt-6 text-center">
                        <a
                            href={`${process.env.NEXT_PUBLIC_API_URL}/storage${digest.summary_markdown_path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-sm"
                        >
                            Download Markdown →
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}
