# ARKLA Frontend - Next.js Documentation

Modern React aplikasi untuk sistem arsip DPRD Sleman dengan UI yang responsif.

## 🎨 Tech Stack

- **Framework**: Next.js 15.0.5
- **Language**: TypeScript 5.7.2
- **UI**: Tailwind CSS 3.4.1
- **Components**: React 19.0.0
- **Icons**: Lucide React
- **Form**: React Hook Form
- **HTTP**: Fetch API
- **Deployment**: Vercel

## 🔧 Setup Development

### Prerequisites
- Node.js 18+
- NPM atau Yarn

### Installation
```bash
# Clone & setup
git clone https://github.com/sayyidfn/proyek_arkla.git
cd proyek_arkla/arkla-frontend

# Install dependencies
npm install
# atau
yarn install

# Environment setup
cp .env.local.example .env.local
# Edit .env.local dengan API URL
```

### Environment Variables
```env
# Backend API
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_BASE_URL=http://localhost:8000

# Production values:
# NEXT_PUBLIC_API_URL=https://sayyidfn-arkla-backend.hf.space/api/v1
# NEXT_PUBLIC_BASE_URL=https://sayyidfn-arkla-backend.hf.space
```

### Development Server
```bash
npm run dev
# atau
yarn dev
```

Aplikasi akan tersedia di:
- **Local**: http://localhost:3000
- **Production**: https://proyekarkla.vercel.app

## 📁 Struktur Proyek

```
src/
├── app/
│   ├── archive/
│   │   ├── [id]/                 # Detail arsip view
│   │   └── page.tsx             # List semua arsip
│   ├── upload/
│   │   └── page.tsx             # Upload dokumen baru
│   ├── export/
│   │   └── page.tsx             # Export & laporan
│   ├── globals.css              # Global Tailwind styles
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Dashboard homepage
├── components/
│   ├── archive/
│   │   ├── ArchiveCard.tsx      # Card komponen arsip
│   │   ├── ArchiveDetail.tsx    # Detail arsip view
│   │   ├── CategoryFilter.tsx   # Filter kategori
│   │   ├── FieldDisplay.tsx     # Field display component
│   │   └── SearchBar.tsx        # Search functionality
│   ├── export/
│   │   ├── ExportForm.tsx       # Form export data
│   │   └── ExportHistory.tsx    # Riwayat export
│   ├── shared/
│   │   ├── Header.tsx           # Navigation header
│   │   ├── Loading.tsx          # Loading components
│   │   ├── Modal.tsx            # Modal dialogs
│   │   └── Pagination.tsx       # Pagination component
│   └── upload/
│       ├── DocumentPreview.tsx  # Preview dokumen
│       ├── FileDropzone.tsx     # Drag & drop upload
│       ├── ProcessingStatus.tsx # Status processing
│       └── ValidationForm.tsx   # Form validasi hasil
├── hooks/
│   ├── useArchive.ts            # Archive management
│   ├── useExport.ts             # Export functionality
│   └── useUpload.ts             # Upload & processing
├── lib/
│   ├── api.ts                   # API client
│   ├── types.ts                 # TypeScript types
│   └── utils.ts                 # Utility functions
└── styles/
    └── components.css           # Component-specific styles
```

## 🚀 Fitur Utama

### 1. Upload Dokumen
**Halaman**: `/upload`
```typescript
// Support multiple file formats
const supportedFormats = ['.pdf', '.jpg', '.jpeg', '.png'];

// Upload dengan validasi
const uploadDocument = async (file: File, category: string) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('category_id', category);
  
  const response = await fetch('/api/v1/process-surat', {
    method: 'POST',
    body: formData
  });
  
  return response.json();
};
```

**Komponen Utama**:
- `FileDropzone` - Drag & drop upload
- `ValidationForm` - Verifikasi hasil OCR
- `ProcessingStatus` - Real-time status

### 2. Archive Management
**Halaman**: `/archive` dan `/archive/[id]`
```typescript
// List arsip dengan filter
const getArchiveList = async (filters: {
  kategori?: string;
  search?: string;
  page?: number;
}) => {
  const params = new URLSearchParams(filters);
  const response = await fetch(`/api/v1/surat?${params}`);
  return response.json();
};

// Detail arsip
const getArchiveDetail = async (id: string) => {
  const response = await fetch(`/api/v1/surat/${id}`);
  return response.json();
};
```

**Komponen Utama**:
- `ArchiveCard` - Card list view
- `ArchiveDetail` - Detail view dengan editing
- `CategoryFilter` - Filter by kategori
- `SearchBar` - Text search

### 3. Export & Laporan
**Halaman**: `/export`
```typescript
// Export data
const exportData = async (params: {
  kategori?: string;
  date_from?: string;
  date_to?: string;
  format: 'xlsx' | 'csv';
}) => {
  const response = await fetch('/api/v1/export', {
    method: 'POST',
    body: JSON.stringify(params)
  });
  
  const blob = await response.blob();
  downloadFile(blob, `arsip_${new Date().toISOString()}.${params.format}`);
};
```

**Komponen Utama**:
- `ExportForm` - Form parameter export
- `ExportHistory` - Riwayat export sebelumnya

## 🎨 UI Components

### Layout Components
```typescript
// Header dengan navigasi
<Header currentPage="archive" />

// Modal untuk confirmasi
<Modal 
  isOpen={showConfirm}
  title="Konfirmasi Hapus"
  onConfirm={handleDelete}
  onCancel={() => setShowConfirm(false)}
/>

// Pagination
<Pagination
  currentPage={page}
  totalPages={totalPages}
  onPageChange={setPage}
/>
```

### Form Components
```typescript
// File upload dengan validasi
<FileDropzone
  onFileSelect={setSelectedFile}
  acceptedTypes={['.pdf', '.jpg', '.jpeg', '.png']}
  maxSize={50 * 1024 * 1024} // 50MB
/>

// Category selector
<CategoryFilter
  categories={DOCUMENT_CATEGORIES}
  selectedCategory={category}
  onCategoryChange={setCategory}
/>
```

### Data Components
```typescript
// Archive card dengan actions
<ArchiveCard
  surat={suratData}
  onView={handleView}
  onEdit={handleEdit}
  onDelete={handleDelete}
/>

// Field display dengan validation
<FieldDisplay
  label="Nomor Surat"
  value={nomor_surat}
  confidence={0.95}
  isEditing={isEditing}
  onChange={handleFieldChange}
/>
```

## 🎯 State Management

### Custom Hooks
```typescript
// useArchive - Archive management
const {
  archives,
  loading,
  error,
  fetchArchives,
  deleteArchive,
  updateArchive
} = useArchive();

// useUpload - File upload & processing
const {
  uploadFile,
  processing,
  progress,
  result,
  error
} = useUpload();

// useExport - Data export
const {
  exportData,
  exporting,
  downloadHistory,
  clearHistory
} = useExport();
```

### Local State Patterns
```typescript
// Form state dengan validation
const [formData, setFormData] = useState<SuratData>({});
const [errors, setErrors] = useState<Record<string, string>>({});
const [isValid, setIsValid] = useState(false);

// UI state management
const [loading, setLoading] = useState(false);
const [showModal, setShowModal] = useState(false);
const [selectedItems, setSelectedItems] = useState<string[]>([]);
```

## 🔧 API Integration

### API Client Setup
```typescript
// lib/api.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export const api = {
  // Upload methods
  uploadDocument: (file: File, category: string) => 
    fetch(`${API_BASE}/process-surat`, {
      method: 'POST',
      body: createFormData({ file, category_id: category })
    }),

  // Archive methods
  getArchives: (params?: ArchiveFilters) =>
    fetch(`${API_BASE}/surat?${new URLSearchParams(params)}`),

  getArchiveDetail: (id: string) =>
    fetch(`${API_BASE}/surat/${id}`),

  // Export methods
  exportData: (params: ExportParams) =>
    fetch(`${API_BASE}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    })
};
```

### Error Handling
```typescript
// Global error handler
const handleApiError = (error: unknown) => {
  if (error instanceof Response) {
    switch (error.status) {
      case 400:
        return 'Data yang dikirim tidak valid';
      case 404:
        return 'Data tidak ditemukan';
      case 422:
        return 'OCR gagal memproses dokumen';
      case 500:
        return 'Terjadi kesalahan server';
      default:
        return 'Terjadi kesalahan tidak dikenal';
    }
  }
  return 'Koneksi ke server bermasalah';
};
```

## 📱 Responsive Design

### Tailwind Breakpoints
```css
/* Mobile First Approach */
.container {
  @apply px-4;
  
  /* sm: 640px */
  @apply sm:px-6;
  
  /* md: 768px */
  @apply md:px-8;
  
  /* lg: 1024px */
  @apply lg:px-12;
  
  /* xl: 1280px */
  @apply xl:max-w-6xl xl:mx-auto;
}

/* Component responsive patterns */
.archive-grid {
  @apply grid grid-cols-1;
  @apply sm:grid-cols-2;
  @apply lg:grid-cols-3;
  @apply xl:grid-cols-4;
}
```

### Mobile Navigation
```typescript
// Responsive header dengan mobile menu
const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  return (
    <header className="bg-white shadow-sm">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Desktop menu */}
        <div className="hidden md:flex md:space-x-8">
          <NavLinks />
        </div>
        
        {/* Mobile menu button */}
        <button 
          className="md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <MenuIcon />
        </button>
      </nav>
    </header>
  );
};
```

## 🚀 Performance Optimization

### Code Splitting
```typescript
// Dynamic imports untuk lazy loading
const ArchiveDetail = dynamic(() => import('@/components/archive/ArchiveDetail'), {
  loading: () => <LoadingSkeleton />,
  ssr: false
});

const ExportForm = dynamic(() => import('@/components/export/ExportForm'), {
  loading: () => <div>Loading...</div>
});
```

### Image Optimization
```typescript
// Next.js Image component
import Image from 'next/image';

<Image
  src={previewUrl}
  alt="Document preview"
  width={800}
  height={600}
  priority={isMainImage}
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,..."
/>
```

### Caching Strategy
```typescript
// API response caching
const useSWR = (key: string, fetcher: () => Promise<any>) => {
  return useSWRHook(key, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 5000
  });
};
```

## 🧪 Testing

### Component Testing
```bash
# Run tests
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

### Manual Testing Checklist
- [ ] Upload berbagai format file (PDF, JPG, PNG)
- [ ] Filter dan search di halaman archive
- [ ] Edit dan update data arsip
- [ ] Export data ke Excel/CSV
- [ ] Responsive di mobile/tablet
- [ ] Loading states dan error handling

## 🚀 Deployment

### Vercel (Production)
```bash
# Deploy ke Vercel
vercel --prod

# Environment variables di Vercel dashboard:
# NEXT_PUBLIC_API_URL=https://sayyidfn-arkla-backend.hf.space/api/v1
# NEXT_PUBLIC_BASE_URL=https://sayyidfn-arkla-backend.hf.space
```

### Build & Export
```bash
# Production build
npm run build

# Start production server
npm start

# Static export (jika diperlukan)
npm run export
```

## 🔗 Links

- **Live App**: https://proyekarkla.vercel.app
- **Backend API**: https://sayyidfn-arkla-backend.hf.space
- **Repository**: https://github.com/sayyidfn/proyek_arkla

## 📝 Contributing

1. Fork repository
2. Create feature branch
3. Make changes dengan TypeScript
4. Test responsiveness
5. Submit pull request
