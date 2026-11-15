import React, { useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  Plus,
  Search,
  LogOut,
  Trash2,
  FileSpreadsheet,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Database,
  MapPin,
  Stethoscope,
} from 'lucide-react';
import {
  auth,
  db,
  HYDRA_PROJECT_METADATA,
  OperationType,
  handleFirestoreError,
  signInWithGoogle,
  signOutUser,
  uploadPhotoToHydraBucket,
} from './firebase';
import {
  AiCatAnalysisResult,
  CatProfile,
  CatSex,
  ColonyBriefingResult,
  FED_STATUSES,
  FedStatus,
  FeedingStation,
  HEALTH_STATUSES,
  HealthStatus,
  HYDRA_ZONES,
  HydraZone,
  SightingLog,
  SUPPLY_LEVELS,
  SupplyLevel,
  TNR_STATUSES,
  TnrStatus,
  WATER_STATUSES,
  WaterStatus,
} from './types';
import { CatVisualAvatar } from './utils/catIllustrations';
import { AiScannerPanel } from './components/AiScannerModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FelisIdLensPage, PawAiStarIcon } from './felisid/FelisIdLensPage';

type ActiveSection = 'registry' | 'sightings' | 'ai-scanner' | 'lens' | 'stations';

function generateSafeId(prefix: string): string {
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `${prefix}_${Date.now()}_${randomPart}`;
}

export function WhiskerWatchHydraContent() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [activeSection, setActiveSection] = useState<ActiveSection>('registry');

  // Firestore Collections State
  const [cats, setCats] = useState<CatProfile[]>([]);
  const [sightings, setSightings] = useState<SightingLog[]>([]);
  const [stations, setStations] = useState<FeedingStation[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Filters & Search
  const [zoneFilter, setZoneFilter] = useState<HydraZone | 'All'>('All');
  const [healthFilter, setHealthFilter] = useState<HealthStatus | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals / Forms
  const [showCatModal, setShowCatModal] = useState(false);
  const [showSightingModal, setShowSightingModal] = useState(false);
  const [showStationModal, setShowStationModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // AI Operational Briefing
  const [briefing, setBriefing] = useState<ColonyBriefingResult | null>(null);
  const [loadingBriefing, setLoadingBriefing] = useState(false);

  // Cat Form State (strictly bounded to firebase-blueprint.json constraints)
  const [catName, setCatName] = useState('');
  const [catZone, setCatZone] = useState<HydraZone>('Hydra Port');
  const [catCoat, setCatCoat] = useState('');
  const [catSex, setCatSex] = useState<CatSex>('Female');
  const [catTnr, setCatTnr] = useState<TnrStatus>('Sterilized (Ear-Tipped)');
  const [catHealth, setCatHealth] = useState<HealthStatus>('Healthy');
  const [catAge, setCatAge] = useState('~2 years');
  const [catMicrochip, setCatMicrochip] = useState('');
  const [catMarkings, setCatMarkings] = useState('');
  const [catMedicalNotes, setCatMedicalNotes] = useState('');
  const [catPhotoFile, setCatPhotoFile] = useState<File | null>(null);
  const [catPhotoPreview, setCatPhotoPreview] = useState('');

  // Sighting Form State
  const [sightingCatId, setSightingCatId] = useState('');
  const [sightingZone, setSightingZone] = useState<HydraZone>('Hydra Port');
  const [sightingCoords, setSightingCoords] = useState('');
  const [sightingBehavior, setSightingBehavior] = useState('');
  const [sightingHealth, setSightingHealth] = useState<HealthStatus>('Healthy');
  const [sightingFed, setSightingFed] = useState<FedStatus>('Fed & Watered');
  const [sightingAiSummary, setSightingAiSummary] = useState('');

  // Station Form State
  const [stationName, setStationName] = useState('');
  const [stationZone, setStationZone] = useState<HydraZone>('Hydra Port');
  const [stationSupply, setStationSupply] = useState<SupplyLevel>('Full');
  const [stationWater, setStationWater] = useState<WaterStatus>('Fresh & Full');
  const [stationDailyCats, setStationDailyCats] = useState(14);
  const [stationNotes, setStationNotes] = useState('');

  // Auth Listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // Real-Time Firestore Listeners (Strictly scoped to authenticated user's ownerId)
  useEffect(() => {
    if (!authReady || !user) {
      setCats([]);
      setSightings([]);
      setStations([]);
      return;
    }

    setLoadingData(true);

    const catsQuery = query(
      collection(db, 'cats'),
      where('ownerId', '==', user.uid)
    );
    const unsubCats = onSnapshot(
      catsQuery,
      (snapshot) => {
        const loaded: CatProfile[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<CatProfile, 'id'>),
        }));
        setCats(loaded);
        setLoadingData(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'cats');
      }
    );

    const sightingsQuery = query(
      collection(db, 'sightings'),
      where('ownerId', '==', user.uid)
    );
    const unsubSightings = onSnapshot(
      sightingsQuery,
      (snapshot) => {
        const loaded: SightingLog[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<SightingLog, 'id'>),
        }));
        setSightings(loaded);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'sightings');
      }
    );

    const stationsQuery = query(
      collection(db, 'stations'),
      where('ownerId', '==', user.uid)
    );
    const unsubStations = onSnapshot(
      stationsQuery,
      (snapshot) => {
        const loaded: FeedingStation[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<FeedingStation, 'id'>),
        }));
        setStations(loaded);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'stations');
      }
    );

    return () => {
      unsubCats();
      unsubSightings();
      unsubStations();
    };
  }, [authReady, user]);

  // Seed Initial Hydra Colony Roster into Dedicated Database
  const handleSeedHydraColony = async () => {
    if (!user || seeding) return;
    setSeeding(true);
    const reporter = (user.displayName || user.email || 'Hydra Caretaker').slice(
      0,
      100
    );

    const sampleCats: Array<Omit<CatProfile, 'id' | 'createdAt' | 'updatedAt'>> =
      [
        {
          name: 'Captain Lazaros',
          colonyZone: 'Hydra Port',
          coatPattern: 'Aegean Ginger & White Tabby',
          sex: 'Male',
          tnrStatus: 'Sterilized (Ear-Tipped)',
          healthStatus: 'Healthy',
          estimatedAge: '~4 years',
          microchipId: 'GR-HYD-900142',
          markingsDescription:
            'Deep marmalade tabby mantle with white chest bib, clean left surgical ear-tip, lounges by the ferry bollards.',
          medicalNotes:
            'Sterilized Oct 2024. Bravecto topical applied. Strong dental condition.',
          photoUrl: 'hydra-storage://captain-lazaros',
          storagePath: `hydra-cats/${user.uid}/captain_lazaros.jpg`,
          lastSeenZone: 'Hydra Port',
          lastSeenText: 'Today · Clocktower Pier',
          ownerId: user.uid,
          reporterName: reporter,
        },
        {
          name: 'Bouboulina',
          colonyZone: 'Kamini Harbor',
          coatPattern: 'Mediterranean Calico',
          sex: 'Female',
          tnrStatus: 'Sterilized (Ear-Tipped)',
          healthStatus: 'Healthy',
          estimatedAge: '~3 years',
          microchipId: 'GR-HYD-900188',
          markingsDescription:
            'Tricolor calico patches over white coat, distinctive black patch over right ear and tipped left ear.',
          medicalNotes:
            'Spayed during Spring Hydra Vet Clinic. Routine deworming complete.',
          photoUrl: 'hydra-storage://bouboulina',
          storagePath: `hydra-cats/${user.uid}/bouboulina.jpg`,
          lastSeenZone: 'Kamini Harbor',
          lastSeenText: 'Today · Castello Steps',
          ownerId: user.uid,
          reporterName: reporter,
        },
        {
          name: 'Nektarios',
          colonyZone: 'Kiafa',
          coatPattern: 'Black & White Tuxedo',
          sex: 'Male',
          tnrStatus: 'Intact - Priority TNR',
          healthStatus: 'Monitor',
          estimatedAge: '~1.5 years',
          microchipId: 'UNREGISTERED',
          markingsDescription:
            'Glossy black tuxedo with symmetrical white paws and narrow white nose stripe. Both ears intact.',
          medicalNotes:
            'Mild upper airway sneeze noted on morning rounds; priority candidate for upcoming mobile TNR clinic.',
          photoUrl: 'hydra-storage://nektarios',
          storagePath: `hydra-cats/${user.uid}/nektarios.jpg`,
          lastSeenZone: 'Kiafa',
          lastSeenText: 'Yesterday · Upper Cistern Lane',
          ownerId: user.uid,
          reporterName: reporter,
        },
        {
          name: 'Melina',
          colonyZone: 'Vlychos',
          coatPattern: 'Silver Mackerel Tabby',
          sex: 'Female',
          tnrStatus: 'Sterilized (Ear-Tipped)',
          healthStatus: 'Needs Vet Care',
          estimatedAge: '~5 years',
          microchipId: 'GR-HYD-900215',
          markingsDescription:
            'Classic silver-grey mackerel stripes with emerald eyes and left ear tip.',
          medicalNotes:
            'Left conjunctivitis flare-up; started terramycin ophthalmic ointment twice daily.',
          photoUrl: 'hydra-storage://melina',
          storagePath: `hydra-cats/${user.uid}/melina.jpg`,
          lastSeenZone: 'Vlychos',
          lastSeenText: 'Today · Stone Bridge Tavern',
          ownerId: user.uid,
          reporterName: reporter,
        },
      ];

    try {
      const createdIds: string[] = [];
      for (const sample of sampleCats) {
        const catId = generateSafeId('cat');
        createdIds.push(catId);
        await setDoc(doc(db, 'cats', catId), {
          ...sample,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      // Seed 2 Sightings linked to the newly created cats
      const sightingId1 = generateSafeId('sight');
      await setDoc(doc(db, 'sightings', sightingId1), {
        catId: createdIds[0],
        catName: 'Captain Lazaros',
        colonyZone: 'Hydra Port',
        coordinatesLabel: 'Harbor Master Stone Steps (37.3498° N, 23.4660° E)',
        behaviorNotes:
          'Greeted morning water-taxi crew, ate 85g wet food, coat glossy and energetic.',
        healthObservation: 'Healthy',
        fedStatus: 'Fed & Watered',
        aiAnalysisSummary:
          'Confirmed 98% biometric match to Captain Lazaros. Left ear-tip verified.',
        photoUrl: 'hydra-storage://sighting-lazaros',
        ownerId: user.uid,
        reporterName: reporter,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const sightingId2 = generateSafeId('sight');
      await setDoc(doc(db, 'sightings', sightingId2), {
        catId: createdIds[3],
        catName: 'Melina',
        colonyZone: 'Vlychos',
        coordinatesLabel: 'Vlychos Pebble Beach Chapel Wall',
        behaviorNotes:
          'Applied morning eye ointment dose with high-value sardine treat.',
        healthObservation: 'Needs Vet Care',
        fedStatus: 'Medication Given',
        aiAnalysisSummary:
          'Triage note: Monitor left eye response over next 48 hours.',
        photoUrl: 'hydra-storage://sighting-melina',
        ownerId: user.uid,
        reporterName: reporter,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Seed 3 Hydra Feeding Stations
      const sampleStations: Array<
        Omit<FeedingStation, 'id' | 'createdAt' | 'updatedAt'>
      > = [
        {
          stationName: 'Bastion Sunset Feeding Point',
          colonyZone: 'Hydra Port',
          supplyLevel: 'Full',
          waterStatus: 'Fresh & Full',
          dailyCatCount: 22,
          assignedCaretaker: reporter,
          notes:
            'Shaded under stone pine steps; 4 ceramic water bowls refilled every morning at 07:30.',
          ownerId: user.uid,
        },
        {
          stationName: 'Kamini Dry Dock Sanctuary Box',
          colonyZone: 'Kamini Harbor',
          supplyLevel: 'Low - Refill Soon',
          waterStatus: 'Fresh & Full',
          dailyCatCount: 16,
          assignedCaretaker: reporter,
          notes:
            'Needs 10kg sack of adult kibble delivered by mule or boat before Friday.',
          ownerId: user.uid,
        },
        {
          stationName: 'Kiafa Upper Windmill Cistern',
          colonyZone: 'Kiafa',
          supplyLevel: 'Adequate',
          waterStatus: 'Refill Required',
          dailyCatCount: 11,
          assignedCaretaker: reporter,
          notes:
            'High-elevation station; priority water check during warm afternoon winds.',
          ownerId: user.uid,
        },
      ];

      for (const st of sampleStations) {
        const stId = generateSafeId('station');
        await setDoc(doc(db, 'stations', stId), {
          ...st,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'cats');
    } finally {
      setSeeding(false);
    }
  };

  // Create New Cat Profile
  const handleCreateCat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || submitting) return;
    setSubmitting(true);

    const catId = generateSafeId('cat');
    const reporter = (user.displayName || user.email || 'Hydra Caretaker').slice(
      0,
      100
    );

    try {
      let photoUrl = 'hydra-storage://inline-cat-portrait';
      let storagePath = `hydra-cats/${user.uid}/${catId}.jpg`;

      if (catPhotoFile) {
        const uploaded = await uploadPhotoToHydraBucket(
          catPhotoFile,
          'cats',
          catPhotoPreview
        );
        photoUrl = uploaded.photoUrl;
        storagePath = uploaded.storagePath;
      }

      await setDoc(doc(db, 'cats', catId), {
        name: catName.trim().slice(0, 80),
        colonyZone: catZone,
        coatPattern: catCoat.trim().slice(0, 80),
        sex: catSex,
        tnrStatus: catTnr,
        healthStatus: catHealth,
        estimatedAge: catAge.trim().slice(0, 40),
        microchipId: (catMicrochip.trim() || 'UNREGISTERED').slice(0, 40),
        markingsDescription: catMarkings.trim().slice(0, 600),
        medicalNotes: catMedicalNotes.trim().slice(0, 1000),
        photoUrl: photoUrl.slice(0, 1000),
        storagePath: storagePath.slice(0, 400),
        lastSeenZone: catZone.slice(0, 60),
        lastSeenText: 'Just registered',
        ownerId: user.uid,
        reporterName: reporter,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setShowCatModal(false);
      setCatName('');
      setCatCoat('');
      setCatMarkings('');
      setCatMedicalNotes('');
      setCatMicrochip('');
      setCatPhotoFile(null);
      setCatPhotoPreview('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `cats/${catId}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Inline Quick Update for TNR or Health Status on Cat Card
  const handleQuickUpdateCat = async (
    cat: CatProfile,
    newTnr: TnrStatus,
    newHealth: HealthStatus
  ) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'cats', cat.id), {
        tnrStatus: newTnr,
        healthStatus: newHealth,
        medicalNotes: cat.medicalNotes,
        lastSeenZone: cat.lastSeenZone,
        lastSeenText: cat.lastSeenText,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `cats/${cat.id}`);
    }
  };

  const handleDeleteCat = async (catId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'cats', catId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `cats/${catId}`);
    }
  };

  // Create New Sighting Log (Enforces Relational Check on /cats/{catId})
  const handleCreateSighting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || submitting) return;

    const targetCat = cats.find((c) => c.id === sightingCatId) || cats[0];
    if (!targetCat) return;

    setSubmitting(true);
    const sightingId = generateSafeId('sight');
    const reporter = (user.displayName || user.email || 'Hydra Caretaker').slice(
      0,
      100
    );

    try {
      await setDoc(doc(db, 'sightings', sightingId), {
        catId: targetCat.id,
        catName: targetCat.name.slice(0, 80),
        colonyZone: sightingZone,
        coordinatesLabel: sightingCoords.trim().slice(0, 120),
        behaviorNotes: sightingBehavior.trim().slice(0, 800),
        healthObservation: sightingHealth,
        fedStatus: sightingFed,
        aiAnalysisSummary: sightingAiSummary.trim().slice(0, 1000),
        photoUrl: 'hydra-storage://sighting-log',
        ownerId: user.uid,
        reporterName: reporter,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Also update the parent cat's lastSeenZone, lastSeenText, and healthStatus
      await updateDoc(doc(db, 'cats', targetCat.id), {
        tnrStatus: targetCat.tnrStatus,
        healthStatus: sightingHealth,
        medicalNotes: targetCat.medicalNotes,
        lastSeenZone: sightingZone.slice(0, 60),
        lastSeenText: `Logged at ${sightingCoords.trim().slice(0, 35)}`,
        updatedAt: serverTimestamp(),
      });

      setShowSightingModal(false);
      setSightingCoords('');
      setSightingBehavior('');
      setSightingAiSummary('');
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.CREATE,
        `sightings/${sightingId}`
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Create Feeding Station
  const handleCreateStation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || submitting) return;
    setSubmitting(true);

    const stId = generateSafeId('station');
    const caretaker = (
      user.displayName ||
      user.email ||
      'Hydra Caretaker'
    ).slice(0, 100);

    try {
      await setDoc(doc(db, 'stations', stId), {
        stationName: stationName.trim().slice(0, 80),
        colonyZone: stationZone,
        supplyLevel: stationSupply,
        waterStatus: stationWater,
        dailyCatCount: Math.max(
          0,
          Math.min(500, Math.round(Number(stationDailyCats) || 0))
        ),
        assignedCaretaker: caretaker,
        notes: stationNotes.trim().slice(0, 600),
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setShowStationModal(false);
      setStationName('');
      setStationNotes('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `stations/${stId}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStationSupply = async (
    station: FeedingStation,
    newSupply: SupplyLevel,
    newWater: WaterStatus
  ) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'stations', station.id), {
        stationName: station.stationName,
        colonyZone: station.colonyZone,
        supplyLevel: newSupply,
        waterStatus: newWater,
        dailyCatCount: station.dailyCatCount,
        assignedCaretaker: station.assignedCaretaker,
        notes: station.notes,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.UPDATE,
        `stations/${station.id}`
      );
    }
  };

  // Generate AI Colony Briefing
  const handleGenerateBriefing = async () => {
    setLoadingBriefing(true);
    try {
      const response = await fetch('/api/ai/colony-briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cats, sightings, stations }),
      });
      if (response.ok) {
        const data = (await response.json()) as ColonyBriefingResult;
        setBriefing(data);
      }
    } catch (err) {
      console.error('Briefing error:', err);
    } finally {
      setLoadingBriefing(false);
    }
  };

  // Export CSV of Hydra Colony Registry
  const handleExportCsv = () => {
    const headers = [
      'Name',
      'Hydra Zone',
      'Coat Pattern',
      'Sex',
      'TNR Status',
      'Health Status',
      'Estimated Age',
      'Microchip ID',
      'Last Seen',
    ];
    const rows = cats.map((c) => [
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.colonyZone}"`,
      `"${c.coatPattern.replace(/"/g, '""')}"`,
      `"${c.sex}"`,
      `"${c.tnrStatus}"`,
      `"${c.healthStatus}"`,
      `"${c.estimatedAge}"`,
      `"${c.microchipId}"`,
      `"${c.lastSeenText.replace(/"/g, '""')}"`,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'whiskerwatch_hydra_colony_registry.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Cats
  const filteredCats = cats.filter((cat) => {
    const matchesZone = zoneFilter === 'All' || cat.colonyZone === zoneFilter;
    const matchesHealth =
      healthFilter === 'All' || cat.healthStatus === healthFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      cat.name.toLowerCase().includes(q) ||
      cat.coatPattern.toLowerCase().includes(q) ||
      cat.markingsDescription.toLowerCase().includes(q) ||
      cat.microchipId.toLowerCase().includes(q);
    return matchesZone && matchesHealth && matchesSearch;
  });

  // Computed Colony Metrics
  const totalCats = cats.length;
  const sterilizedCount = cats.filter(
    (c) => c.tnrStatus === 'Sterilized (Ear-Tipped)'
  ).length;
  const tnrRate =
    totalCats > 0 ? Math.round((sterilizedCount / totalCats) * 100) : 0;
  const medicalAttentionCount = cats.filter(
    (c) =>
      c.healthStatus === 'Needs Vet Care' || c.healthStatus === 'In Treatment'
  ).length;
  const urgentStationCount = stations.filter(
    (s) =>
      s.supplyLevel === 'Low - Refill Soon' ||
      s.supplyLevel === 'Empty - Urgent' ||
      s.waterStatus !== 'Fresh & Full'
  ).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="flex items-center justify-between gap-8 px-6 py-4 bg-white border-b border-slate-200 sticky top-0 z-30">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveSection('registry');
          }}
          className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
        >
          WhiskerWatch Hydra
        </a>

        {/* Zone 2: 4 clean single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <button
            type="button"
            onClick={() => setActiveSection('registry')}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
              activeSection === 'registry'
                ? 'text-slate-900 border-b-2 border-teal-700'
                : ''
            }`}
          >
            Colony Registry
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('sightings')}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
              activeSection === 'sightings'
                ? 'text-slate-900 border-b-2 border-teal-700'
                : ''
            }`}
          >
            Sightings & Triage
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('ai-scanner')}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
              activeSection === 'ai-scanner'
                ? 'text-slate-900 border-b-2 border-teal-700'
                : ''
            }`}
          >
            AI Identification
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('lens')}
            className={`inline-flex items-center gap-1.5 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
              activeSection === 'lens'
                ? 'text-slate-900 border-b-2 border-teal-700'
                : ''
            }`}
          >
            <PawAiStarIcon className="w-4 h-4 text-teal-700" />
            <span>Lens</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('stations')}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
              activeSection === 'stations'
                ? 'text-slate-900 border-b-2 border-teal-700'
                : ''
            }`}
          >
            Feeding Stations
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          {!user ? (
            <button
              type="button"
              onClick={() => signInWithGoogle()}
              className="px-4 py-2 text-xs font-medium text-white bg-teal-700 rounded-lg hover:bg-teal-800 transition-colors whitespace-nowrap shrink-0"
            >
              Sign In with Google
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowCatModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-teal-700 rounded-lg hover:bg-teal-800 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register Hydra Cat</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 space-y-8">
        {/* Hero & Sanctuary Isolation Context */}
        <section className="bg-white border border-slate-200 rounded-xl p-6 lg:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Saronic Islands Feline Sanctuary</span>
                <span aria-hidden="true">·</span>
                <span>Hydra Island, Greece</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono">
                  Isolated DB: {HYDRA_PROJECT_METADATA.projectId}
                </span>
              </div>

              <h1
                className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight"
                style={{ textWrap: 'balance' }}
              >
                Hydra Island Feline Colony Biometrics, TNR Sterilization &
                Veterinary Triage
              </h1>

              <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">
                WhiskerWatch Hydra operates on a dedicated, air-gapped Firebase
                Firestore database and Storage bucket exclusively for Hydra Port,
                Kamini Harbor, Vlychos, Kaminia, Kiafa, and Mandraki—with zero
                connection to Koilada records.
              </p>

              {/* Mobile Section Switcher */}
              <div className="flex md:hidden items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
                {(
                  [
                    ['registry', 'Registry'],
                    ['sightings', 'Sightings'],
                    ['ai-scanner', 'AI Scanner'],
                    ['lens', 'Lens'],
                    ['stations', 'Stations'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveSection(key)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      activeSection === key
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {user ? (
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  {cats.length === 0 && (
                    <button
                      type="button"
                      onClick={handleSeedHydraColony}
                      disabled={seeding}
                      className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
                    >
                      <Database className="w-3.5 h-3.5" />
                      <span>
                        {seeding
                          ? 'Seeding Hydra Records...'
                          : 'Seed Initial Hydra Colony Roster'}
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      if (cats.length > 0 && !sightingCatId) {
                        setSightingCatId(cats[0].id);
                      }
                      setShowSightingModal(true);
                    }}
                    disabled={cats.length === 0}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Log Field Sighting</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleGenerateBriefing}
                    disabled={loadingBriefing || cats.length === 0}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${
                        loadingBriefing ? 'animate-spin' : ''
                      }`}
                    />
                    <span>Generate AI Colony Briefing</span>
                  </button>

                  {cats.length > 0 && (
                    <button
                      type="button"
                      onClick={handleExportCsv}
                      className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Export CSV</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="pt-1 flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => signInWithGoogle()}
                    className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                  >
                    Authenticate Caretaker Account
                  </button>
                  <span className="text-xs text-slate-500">
                    Google Sign-In required by Zero-Trust Firestore security rules
                  </span>
                </div>
              )}
            </div>

            {/* Right Column: Quantitative KPI Grid */}
            <div className="lg:col-span-5 grid grid-cols-2 gap-4 pt-4 lg:pt-0 border-t lg:border-t-0 lg:border-l border-slate-200 lg:pl-8">
              <div className="space-y-1">
                <div className="text-xs text-slate-500">Registered Hydra Cats</div>
                <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                  {totalCats}
                </div>
                <div className="text-xs text-slate-500">
                  Across 6 island zones
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-xs text-slate-500">TNR Sterilization Rate</div>
                <div className="text-2xl font-bold font-mono tabular-nums text-teal-700">
                  {tnrRate}%
                </div>
                <div className="text-xs text-slate-500 tabular-nums">
                  {sterilizedCount} of {totalCats} ear-tipped
                </div>
              </div>

              <div className="space-y-1 pt-2 border-t border-slate-100">
                <div className="text-xs text-slate-500">Active Vet Triage</div>
                <div className="text-2xl font-bold font-mono tabular-nums text-amber-700">
                  {medicalAttentionCount}
                </div>
                <div className="text-xs text-slate-500">
                  Requiring treatment or review
                </div>
              </div>

              <div className="space-y-1 pt-2 border-t border-slate-100">
                <div className="text-xs text-slate-500">Station Refill Alerts</div>
                <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                  {urgentStationCount}
                </div>
                <div className="text-xs text-slate-500 tabular-nums">
                  {stations.length} total Hydra stations
                </div>
              </div>
            </div>
          </div>

          {/* Optional AI Operational Briefing Output */}
          {briefing && (
            <div className="mt-6 pt-6 border-t border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">
                  Hydra Operational Briefing — {briefing.headline}
                </h2>
                <button
                  type="button"
                  onClick={() => setBriefing(null)}
                  className="text-xs text-slate-500 hover:text-slate-900 whitespace-nowrap shrink-0"
                >
                  Dismiss
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-700">
                <div className="space-y-1.5">
                  <div className="font-semibold text-slate-900">
                    TNR Sterilization Priorities
                  </div>
                  <ul className="space-y-1 list-disc list-inside">
                    {briefing.tnrPriorities.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-1.5">
                  <div className="font-semibold text-slate-900">
                    Veterinary Watchlist
                  </div>
                  <ul className="space-y-1 list-disc list-inside">
                    {briefing.medicalWatchlist.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-1.5">
                  <div className="font-semibold text-slate-900">
                    Feeding & Water Logistics
                  </div>
                  <ul className="space-y-1 list-disc list-inside">
                    {briefing.supplyActions.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Unauthenticated Prompt */}
        {!user ? (
          <section className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Sign In to Access the Dedicated Hydra Island Sanctuary Database
            </h2>
            <p className="text-sm text-slate-600 max-w-xl mx-auto">
              All records in WhiskerWatch Hydra are protected by Attribute-Based
              Access Control (ABAC) Firestore security rules and stored in
              isolated database{' '}
              <span className="font-mono text-slate-800">
                {HYDRA_PROJECT_METADATA.firestoreDatabaseId}
              </span>
              .
            </p>
            <div>
              <button
                type="button"
                onClick={() => signInWithGoogle()}
                className="px-5 py-2.5 text-xs font-medium text-white bg-teal-700 rounded-lg hover:bg-teal-800 transition-colors whitespace-nowrap shrink-0"
              >
                Sign In with Google to Manage Hydra Colony
              </button>
            </div>
          </section>
        ) : (
          <>
            {/* SECTION 1: COLONY REGISTRY */}
            {activeSection === 'registry' && (
              <section className="space-y-6">
                {/* Filter & Search Bar */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-4">
                  {/* Interactive Zone Filter Controls */}
                  <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
                    {(['All', ...HYDRA_ZONES] as const).map((zone) => (
                      <button
                        key={zone}
                        type="button"
                        onClick={() => setZoneFilter(zone)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                          zoneFilter === zone
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {zone}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {/* Health Status Filter */}
                    <select
                      value={healthFilter}
                      onChange={(e) =>
                        setHealthFilter(e.target.value as HealthStatus | 'All')
                      }
                      aria-label="Filter by health status"
                      className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-700"
                    >
                      <option value="All">All Health States</option>
                      {HEALTH_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>

                    {/* Live Search Input */}
                    <div className="relative flex-1 sm:w-64">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search name, coat, microchip..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700"
                      />
                    </div>
                  </div>
                </div>

                {/* Loading / Empty / Populated States */}
                {loadingData ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((n) => (
                      <div
                        key={n}
                        className="h-96 bg-white border border-slate-200 rounded-xl p-5 animate-pulse space-y-4"
                      >
                        <div className="h-40 bg-slate-200 rounded-lg" />
                        <div className="h-4 bg-slate-200 rounded w-1/2" />
                        <div className="h-3 bg-slate-100 rounded w-3/4" />
                        <div className="h-20 bg-slate-100 rounded" />
                      </div>
                    ))}
                  </div>
                ) : filteredCats.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
                    <h3 className="text-base font-semibold text-slate-900">
                      No Hydra Colony Cats Found
                    </h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      {cats.length === 0
                        ? 'Your isolated Hydra Firestore database is currently empty. Seed the initial Hydra Island roster or register a new cat profile.'
                        : 'No cats match your active zone or health filter criteria.'}
                    </p>
                    <div className="flex items-center justify-center gap-3 pt-2">
                      {cats.length === 0 ? (
                        <button
                          type="button"
                          onClick={handleSeedHydraColony}
                          disabled={seeding}
                          className="px-4 py-2 text-xs font-medium text-white bg-teal-700 rounded-lg hover:bg-teal-800 transition-colors whitespace-nowrap shrink-0"
                        >
                          {seeding
                            ? 'Seeding Hydra Colony...'
                            : 'Seed Initial Hydra Colony Roster'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setZoneFilter('All');
                            setHealthFilter('All');
                            setSearchQuery('');
                          }}
                          className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0"
                        >
                          Reset Filters
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCats.map((cat) => (
                      <article
                        key={cat.id}
                        className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col justify-between"
                      >
                        <div>
                          <CatVisualAvatar
                            name={cat.name}
                            coatPattern={cat.coatPattern}
                            colonyZone={cat.colonyZone}
                            earTipped={
                              cat.tnrStatus === 'Sterilized (Ear-Tipped)'
                            }
                            photoUrl={cat.photoUrl}
                            photoTransform={cat.photoTransform}
                            className="w-full h-44"
                          />

                          <div className="p-5 space-y-3">
                            {/* Title & Unboxed Static Metadata (Zero-Pill Discipline) */}
                            <div>
                              <div className="flex items-center justify-between gap-2">
                                <h3 className="text-base font-semibold text-slate-900 truncate">
                                  {cat.name}
                                </h3>
                                <span className="text-xs font-mono text-slate-500 shrink-0">
                                  {cat.estimatedAge} · {cat.sex}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 mt-1">
                                <span>{cat.colonyZone}</span>
                                <span aria-hidden="true">·</span>
                                <span>{cat.tnrStatus}</span>
                                <span aria-hidden="true">·</span>
                                <span
                                  className={
                                    cat.healthStatus === 'Healthy'
                                      ? 'text-emerald-700 font-medium'
                                      : cat.healthStatus === 'Monitor'
                                      ? 'text-amber-700 font-medium'
                                      : 'text-red-700 font-medium'
                                  }
                                >
                                  {cat.healthStatus}
                                </span>
                              </div>
                            </div>

                            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                              {cat.markingsDescription}
                            </p>

                            {cat.medicalNotes && (
                              <div className="pt-2 border-t border-slate-100 text-xs text-slate-600">
                                <span className="font-medium text-slate-800">
                                  Vet Notes:{' '}
                                </span>
                                {cat.medicalNotes}
                              </div>
                            )}

                            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 font-mono">
                              <span>ID: {cat.microchipId}</span>
                              <span className="truncate max-w-[160px]">
                                {cat.lastSeenText}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Interactive Caretaker Controls */}
                        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <select
                              aria-label={`Update health status for ${cat.name}`}
                              value={cat.healthStatus}
                              onChange={(e) =>
                                handleQuickUpdateCat(
                                  cat,
                                  cat.tnrStatus,
                                  e.target.value as HealthStatus
                                )
                              }
                              className="px-2 py-1 text-xs bg-white border border-slate-300 rounded text-slate-800"
                            >
                              {HEALTH_STATUSES.map((st) => (
                                <option key={st} value={st}>
                                  {st}
                                </option>
                              ))}
                            </select>

                            <select
                              aria-label={`Update TNR status for ${cat.name}`}
                              value={cat.tnrStatus}
                              onChange={(e) =>
                                handleQuickUpdateCat(
                                  cat,
                                  e.target.value as TnrStatus,
                                  cat.healthStatus
                                )
                              }
                              className="px-2 py-1 text-xs bg-white border border-slate-300 rounded text-slate-800 max-w-[135px]"
                            >
                              {TNR_STATUSES.map((st) => (
                                <option key={st} value={st}>
                                  {st}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setSightingCatId(cat.id);
                                setSightingZone(cat.colonyZone);
                                setSightingHealth(cat.healthStatus);
                                setShowSightingModal(true);
                              }}
                              className="px-2.5 py-1 text-xs font-medium text-teal-800 hover:bg-teal-50 rounded transition-colors whitespace-nowrap shrink-0"
                            >
                              + Sighting
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCat(cat.id)}
                              title={`Remove ${cat.name}`}
                              className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* SECTION 2: SIGHTINGS & TRIAGE LEDGER */}
            {activeSection === 'sightings' && (
              <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      Hydra Field Sightings & Veterinary Triage Log
                    </h2>
                    <p className="text-xs text-slate-500">
                      Relational field logs verified against registered Hydra
                      colony cat profiles
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (cats.length > 0 && !sightingCatId) {
                        setSightingCatId(cats[0].id);
                      }
                      setShowSightingModal(true);
                    }}
                    disabled={cats.length === 0}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Log Field Sighting</span>
                  </button>
                </div>

                {sightings.length === 0 ? (
                  <div className="p-10 text-center space-y-2">
                    <p className="text-sm font-medium text-slate-800">
                      No Sightings Logged Yet
                    </p>
                    <p className="text-xs text-slate-500">
                      Record a sighting or seed the Hydra colony dataset to track
                      feeding and clinical observations.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-xs font-medium text-slate-500 bg-slate-50">
                          <th className="py-3 px-4">Cat Name</th>
                          <th className="py-3 px-4">Hydra Zone & Landmark</th>
                          <th className="py-3 px-4">Care Action</th>
                          <th className="py-3 px-4">Health State</th>
                          <th className="py-3 px-4">Field & AI Triage Notes</th>
                          <th className="py-3 px-4 text-right">Caretaker</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-xs">
                        {sightings.map((s) => (
                          <tr
                            key={s.id}
                            className="hover:bg-slate-50 transition-colors"
                          >
                            <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                              {s.catName}
                            </td>
                            <td className="py-3 px-4 text-slate-600">
                              <span className="font-medium text-slate-800">
                                {s.colonyZone}
                              </span>{' '}
                              · {s.coordinatesLabel}
                            </td>
                            <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                              {s.fedStatus}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span
                                className={
                                  s.healthObservation === 'Healthy'
                                    ? 'text-emerald-700 font-medium'
                                    : s.healthObservation === 'Monitor'
                                    ? 'text-amber-700 font-medium'
                                    : 'text-red-700 font-medium'
                                }
                              >
                                {s.healthObservation}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-600 max-w-md">
                              <div>{s.behaviorNotes}</div>
                              {s.aiAnalysisSummary && (
                                <div className="text-slate-500 mt-0.5">
                                  AI Note: {s.aiAnalysisSummary}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right text-slate-500 whitespace-nowrap">
                              {s.reporterName}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}

            {/* SECTION 3: AI IDENTIFICATION & TRIAGE */}
            {activeSection === 'ai-scanner' && (
              <AiScannerPanel
                existingCats={cats}
                onApplyToNewCat={(result, zone, file, previewUrl) => {
                  setCatZone(zone);
                  setCatCoat(result.coatPattern.slice(0, 80));
                  setCatAge(result.estimatedAge.slice(0, 40));
                  setCatSex(result.sexGuess);
                  setCatTnr(result.recommendedTnrStatus);
                  setCatHealth(result.recommendedHealthStatus);
                  setCatMarkings(result.markingsSummary.slice(0, 600));
                  setCatMedicalNotes(result.triageAssessment.slice(0, 1000));
                  setCatPhotoFile(file);
                  setCatPhotoPreview(previewUrl);
                  setShowCatModal(true);
                }}
                onApplyToSighting={(result, zone, matched, _previewUrl) => {
                  if (matched) {
                    setSightingCatId(matched.id);
                  } else if (cats[0]) {
                    setSightingCatId(cats[0].id);
                  }
                  setSightingZone(zone);
                  setSightingHealth(result.recommendedHealthStatus);
                  setSightingBehavior(result.markingsSummary.slice(0, 800));
                  setSightingAiSummary(
                    `${result.triageAssessment} (${result.matchConfidence}% match)`.slice(
                      0,
                      1000
                    )
                  );
                  setShowSightingModal(true);
                }}
              />
            )}

            {/* SECTION 4: FEEDING & FRESH WATER STATIONS */}
            {activeSection === 'stations' && (
              <section className="space-y-6">
                <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      Hydra Island Feeding & Fresh Water Stations
                    </h2>
                    <p className="text-xs text-slate-500">
                      Daily kibble inventory and ceramic water cistern tracking
                      across Hydra zones
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowStationModal(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Feeding Station</span>
                  </button>
                </div>

                {stations.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-2">
                    <p className="text-sm font-medium text-slate-800">
                      No Feeding Stations Configured
                    </p>
                    <p className="text-xs text-slate-500">
                      Add a feeding station or seed the initial Hydra colony
                      dataset.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {stations.map((station) => (
                      <div
                        key={station.id}
                        className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between space-y-4"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="text-base font-semibold text-slate-900">
                              {station.stationName}
                            </h3>
                            <span className="text-xs font-mono tabular-nums text-slate-600">
                              {station.dailyCatCount} cats/day
                            </span>
                          </div>

                          <div className="text-xs text-slate-500">
                            <span>{station.colonyZone}</span>
                            <span aria-hidden="true"> · </span>
                            <span>Caretaker: {station.assignedCaretaker}</span>
                          </div>

                          <p className="text-xs text-slate-600 leading-relaxed pt-1">
                            {station.notes || 'Standard daily feeding schedule.'}
                          </p>
                        </div>

                        <div className="pt-3 border-t border-slate-200 space-y-2.5 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-slate-500">Food Supply:</span>
                            <select
                              aria-label={`Supply level for ${station.stationName}`}
                              value={station.supplyLevel}
                              onChange={(e) =>
                                handleUpdateStationSupply(
                                  station,
                                  e.target.value as SupplyLevel,
                                  station.waterStatus
                                )
                              }
                              className="px-2 py-1 text-xs bg-slate-50 border border-slate-300 rounded text-slate-800"
                            >
                              {SUPPLY_LEVELS.map((lvl) => (
                                <option key={lvl} value={lvl}>
                                  {lvl}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <span className="text-slate-500">Fresh Water:</span>
                            <select
                              aria-label={`Water status for ${station.stationName}`}
                              value={station.waterStatus}
                              onChange={(e) =>
                                handleUpdateStationSupply(
                                  station,
                                  station.supplyLevel,
                                  e.target.value as WaterStatus
                                )
                              }
                              className="px-2 py-1 text-xs bg-slate-50 border border-slate-300 rounded text-slate-800"
                            >
                              {WATER_STATUSES.map((w) => (
                                <option key={w} value={w}>
                                  {w}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* SECTION 5: FELISID-LENS TAB */}
            {activeSection === 'lens' && (
              <section className="rounded-2xl overflow-hidden border border-slate-800 shadow-xl">
                <FelisIdLensPage />
              </section>
            )}
          </>
        )}
      </main>

      {/* Quiet Footer with Dedicated Project Isolation Details & Sign Out */}
      <footer className="bg-white border-t border-slate-200 px-6 py-4 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex flex-wrap items-center gap-2">
            <span>WhiskerWatch Hydra Sanctuary Platform</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">
              Storage: {HYDRA_PROJECT_METADATA.storageBucket}
            </span>
          </div>

          {user && (
            <div className="flex items-center gap-4">
              <span>Signed in as {user.email}</span>
              <button
                type="button"
                onClick={() => signOutUser()}
                className="inline-flex items-center gap-1 text-slate-700 hover:text-slate-900 font-medium whitespace-nowrap shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </footer>

      {/* MODAL 1: REGISTER NEW HYDRA CAT */}
      {showCatModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-xl max-w-xl w-full p-6 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-lg font-semibold text-slate-900">
                Register Hydra Colony Cat Profile
              </h2>
              <button
                type="button"
                onClick={() => setShowCatModal(false)}
                className="text-xs text-slate-500 hover:text-slate-900"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleCreateCat} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Cat Name *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={80}
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    placeholder="e.g. Captain Lazaros"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Hydra Island Zone *
                  </label>
                  <select
                    value={catZone}
                    onChange={(e) => setCatZone(e.target.value as HydraZone)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white"
                  >
                    {HYDRA_ZONES.map((z) => (
                      <option key={z} value={z}>
                        {z}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Coat Pattern *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={80}
                    value={catCoat}
                    onChange={(e) => setCatCoat(e.target.value)}
                    placeholder="e.g. Aegean Ginger & White"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Sex *
                  </label>
                  <select
                    value={catSex}
                    onChange={(e) => setCatSex(e.target.value as CatSex)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Unknown">Unknown</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    TNR Sterilization Status *
                  </label>
                  <select
                    value={catTnr}
                    onChange={(e) => setCatTnr(e.target.value as TnrStatus)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white"
                  >
                    {TNR_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Veterinary Health Status *
                  </label>
                  <select
                    value={catHealth}
                    onChange={(e) =>
                      setCatHealth(e.target.value as HealthStatus)
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white"
                  >
                    {HEALTH_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Estimated Age *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={40}
                    value={catAge}
                    onChange={(e) => setCatAge(e.target.value)}
                    placeholder="e.g. ~2 years"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Microchip / Ear Tag ID
                  </label>
                  <input
                    type="text"
                    maxLength={40}
                    value={catMicrochip}
                    onChange={(e) => setCatMicrochip(e.target.value)}
                    placeholder="e.g. GR-HYD-900310"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Upload Photo to Hydra Storage Bucket
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setCatPhotoFile(f);
                    if (f) {
                      const reader = new FileReader();
                      reader.onload = () => {
                        if (typeof reader.result === 'string') {
                          setCatPhotoPreview(reader.result);
                        }
                      };
                      reader.readAsDataURL(f);
                    }
                  }}
                  className="w-full text-xs text-slate-600"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Distinguishing Markings & Ear-Tip Description *
                </label>
                <textarea
                  rows={2}
                  required
                  maxLength={600}
                  value={catMarkings}
                  onChange={(e) => setCatMarkings(e.target.value)}
                  placeholder="Describe facial markings, tail rings, and tipped ear side..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Veterinary & Clinical Notes
                </label>
                <textarea
                  rows={2}
                  maxLength={1000}
                  value={catMedicalNotes}
                  onChange={(e) => setCatMedicalNotes(e.target.value)}
                  placeholder="Vaccination dates, parasite treatment, dental or ophthalmic notes..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCatModal(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 font-medium text-white bg-teal-700 rounded-lg hover:bg-teal-800 disabled:opacity-50"
                >
                  {submitting ? 'Saving to Hydra DB...' : 'Save Cat Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: LOG FIELD SIGHTING */}
      {showSightingModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-lg font-semibold text-slate-900">
                Log Hydra Field Sighting & Care Action
              </h2>
              <button
                type="button"
                onClick={() => setShowSightingModal(false)}
                className="text-xs text-slate-500 hover:text-slate-900"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleCreateSighting} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Select Registered Hydra Cat *
                </label>
                <select
                  value={sightingCatId}
                  onChange={(e) => setSightingCatId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white"
                >
                  {cats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.colonyZone} · {c.coatPattern})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Hydra Sighting Zone *
                  </label>
                  <select
                    value={sightingZone}
                    onChange={(e) =>
                      setSightingZone(e.target.value as HydraZone)
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white"
                  >
                    {HYDRA_ZONES.map((z) => (
                      <option key={z} value={z}>
                        {z}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Landmark / Step Location *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={120}
                    value={sightingCoords}
                    onChange={(e) => setSightingCoords(e.target.value)}
                    placeholder="e.g.Rafalia Pharmacy Alley"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Care Action Taken *
                  </label>
                  <select
                    value={sightingFed}
                    onChange={(e) =>
                      setSightingFed(e.target.value as FedStatus)
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white"
                  >
                    {FED_STATUSES.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Observed Health State *
                  </label>
                  <select
                    value={sightingHealth}
                    onChange={(e) =>
                      setSightingHealth(e.target.value as HealthStatus)
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white"
                  >
                    {HEALTH_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Field Behavior & Clinical Observations *
                </label>
                <textarea
                  rows={3}
                  required
                  maxLength={800}
                  value={sightingBehavior}
                  onChange={(e) => setSightingBehavior(e.target.value)}
                  placeholder="Appetite, weight condition, interaction with colony mates..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowSightingModal(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50"
                >
                  {submitting ? 'Logging...' : 'Record Sighting'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD FEEDING STATION */}
      {showStationModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-lg font-semibold text-slate-900">
                Add Hydra Feeding & Water Station
              </h2>
              <button
                type="button"
                onClick={() => setShowStationModal(false)}
                className="text-xs text-slate-500 hover:text-slate-900"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleCreateStation} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Station Landmark Name *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={80}
                    value={stationName}
                    onChange={(e) => setStationName(e.target.value)}
                    placeholder="e.g. Mandraki Harbor Steps"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Hydra Island Zone *
                  </label>
                  <select
                    value={stationZone}
                    onChange={(e) =>
                      setStationZone(e.target.value as HydraZone)
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white"
                  >
                    {HYDRA_ZONES.map((z) => (
                      <option key={z} value={z}>
                        {z}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Food Supply Level *
                  </label>
                  <select
                    value={stationSupply}
                    onChange={(e) =>
                      setStationSupply(e.target.value as SupplyLevel)
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white"
                  >
                    {SUPPLY_LEVELS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Water Bowl Status *
                  </label>
                  <select
                    value={stationWater}
                    onChange={(e) =>
                      setStationWater(e.target.value as WaterStatus)
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white"
                  >
                    {WATER_STATUSES.map((w) => (
                      <option key={w} value={w}>
                        {w}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Estimated Daily Cats Served *
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={500}
                    required
                    value={stationDailyCats}
                    onChange={(e) =>
                      setStationDailyCats(Number(e.target.value))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Caretaker Schedule & Delivery Notes
                </label>
                <textarea
                  rows={2}
                  maxLength={600}
                  value={stationNotes}
                  onChange={(e) => setStationNotes(e.target.value)}
                  placeholder="Refill schedule, shade cover, mule delivery instructions..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowStationModal(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Station'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <WhiskerWatchHydraContent />
    </ErrorBoundary>
  );
}
