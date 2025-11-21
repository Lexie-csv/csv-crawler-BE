'use client';

import { useEffect, useState } from 'react';
import { sourcesApi, Source, CreateSourceInput } from '@/lib/api';
import { Table } from '@/components/Table';
import { Modal } from '@/components/Modal';

export default function SourcesPage(): JSX.Element {
    const [sources, setSources] = useState<Source[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSource, setEditingSource] = useState<Source | null>(null);
    const [formData, setFormData] = useState<CreateSourceInput>({
        name: '',
        url: '',
        type: 'policy',
        country: 'PH',
        sector: '',
        active: true,
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadSources();
    }, []);

    const loadSources = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await sourcesApi.list();
            setSources(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load sources');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (source?: Source) => {
        if (source) {
            setEditingSource(source);
            setFormData({
                name: source.name,
                url: source.url,
                type: source.type,
                country: source.country,
                sector: source.sector || '',
                active: source.active,
            });
        } else {
            setEditingSource(null);
            setFormData({
                name: '',
                url: '',
                type: 'policy',
                country: 'PH',
                sector: '',
                active: true,
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingSource(null);
        setFormData({
            name: '',
            url: '',
            type: 'policy',
            country: 'PH',
            sector: '',
            active: true,
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        try {
            const payload = {
                ...formData,
                sector: formData.sector || null,
            };

            if (editingSource) {
                await sourcesApi.update(editingSource.id, payload);
            } else {
                await sourcesApi.create(payload);
            }

            await loadSources();
            handleCloseModal();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save source');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this source?')) return;

        try {
            setError(null);
            await sourcesApi.delete(id);
            await loadSources();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete source');
        }
    };

    const columns = [
        {
            key: 'name',
            header: 'Name',
            render: (source: Source) => (
                <div>
                    <div className="font-medium">{source.name}</div>
                    <div className="text-xs text-secondary">{source.type}</div>
                </div>
            ),
            width: '25%',
        },
        {
            key: 'url',
            header: 'URL',
            render: (source: Source) => (
                <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline truncate block max-w-xs"
                >
                    {source.url}
                </a>
            ),
            width: '30%',
        },
        {
            key: 'metadata',
            header: 'Country / Sector',
            render: (source: Source) => (
                <div className="text-sm">
                    <div>{source.country}</div>
                    {source.sector && <div className="text-secondary">{source.sector}</div>}
                </div>
            ),
            width: '15%',
        },
        {
            key: 'status',
            header: 'Status',
            render: (source: Source) => (
                <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${source.active
                            ? 'bg-green-100 text-green-800 border border-green-200'
                            : 'bg-gray-100 text-gray-800 border border-gray-200'
                        }`}
                >
                    {source.active ? 'Active' : 'Inactive'}
                </span>
            ),
            width: '10%',
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (source: Source) => (
                <div className="flex gap-2">
                    <button
                        onClick={() => handleOpenModal(source)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                        Edit
                    </button>
                    <button
                        onClick={() => handleDelete(source.id)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                        Delete
                    </button>
                </div>
            ),
            width: '20%',
        },
    ];

    return (
        <div className="min-h-screen bg-bg-page">
            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-2">
                        <h1 className="text-3xl font-bold text-copy">Sources</h1>
                        <button
                            onClick={() => handleOpenModal()}
                            className="px-4 py-2 bg-copy text-white rounded-md text-sm font-medium hover:bg-opacity-90 transition"
                        >
                            + Add Source
                        </button>
                    </div>
                    <p className="text-secondary">
                        Manage regulatory and policy data sources for monitoring
                    </p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-sm text-red-800">{error}</p>
                    </div>
                )}

                {/* Loading State */}
                {loading ? (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-copy"></div>
                        <p className="mt-4 text-secondary">Loading sources...</p>
                    </div>
                ) : (
                    /* Table */
                    <div className="bg-white rounded-lg shadow-sm border border-border">
                        <Table
                            columns={columns}
                            data={sources}
                            keyExtractor={(source) => source.id}
                            emptyMessage="No sources found. Add your first source to get started."
                        />
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingSource ? 'Edit Source' : 'Add New Source'}
                footer={
                    <>
                        <button
                            onClick={handleCloseModal}
                            className="px-4 py-2 text-sm font-medium text-secondary hover:text-copy transition"
                            disabled={submitting}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            className="px-4 py-2 bg-copy text-white rounded-md text-sm font-medium hover:bg-opacity-90 transition disabled:opacity-50"
                            disabled={submitting}
                        >
                            {submitting ? 'Saving...' : editingSource ? 'Update Source' : 'Create Source'}
                        </button>
                    </>
                }
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-copy mb-1">
                            Name *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-copy focus:border-transparent"
                            placeholder="e.g., BSP Regulations"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-copy mb-1">
                            URL *
                        </label>
                        <input
                            type="url"
                            value={formData.url}
                            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-copy focus:border-transparent"
                            placeholder="https://example.com/regulations"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-copy mb-1">
                                Type *
                            </label>
                            <select
                                value={formData.type}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        type: e.target.value as 'policy' | 'exchange' | 'gazette' | 'ifi' | 'portal' | 'news',
                                    })
                                }
                                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-copy focus:border-transparent"
                                required
                            >
                                <option value="policy">Policy</option>
                                <option value="exchange">Stock Exchange</option>
                                <option value="gazette">Government Gazette</option>
                                <option value="ifi">International Finance Institution</option>
                                <option value="portal">Government Portal</option>
                                <option value="news">News</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-copy mb-1">
                                Country *
                            </label>
                            <input
                                type="text"
                                value={formData.country}
                                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-copy focus:border-transparent"
                                placeholder="e.g., PH, SG, TH"
                                required
                                maxLength={2}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-copy mb-1">
                            Sector (Optional)
                        </label>
                        <input
                            type="text"
                            value={formData.sector || ''}
                            onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-copy focus:border-transparent"
                            placeholder="e.g., Banking, Healthcare, Energy"
                        />
                    </div>

                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="active"
                            checked={formData.active}
                            onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                            className="h-4 w-4 text-copy focus:ring-copy border-border rounded"
                        />
                        <label htmlFor="active" className="ml-2 text-sm text-copy">
                            Active (enable monitoring)
                        </label>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
