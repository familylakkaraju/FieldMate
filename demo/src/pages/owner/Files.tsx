import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Camera, FileText, Grid2x2, List, Upload } from 'lucide-react';
import type { ServiceType } from '../../types/domain';
import { useDemo } from '../../app/DemoProvider';
import { ACTIVE_STATUSES, getCustomer, getJob, getTask, tasksForJob } from '../../app/selectors';
import { EmptyState, PageHeader } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { FilterChips, Segmented, SelectInput } from '../../components/common/Form';
import { ServiceBadge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { EvidenceGrid } from '../../components/shared/EvidenceGrid';
import { EvidenceDialog } from '../../components/shared/JobActionDialogs';
import { asset } from '../../utils/cx';
import { relativeDay, time } from '../../utils/format';

type Cat = 'all' | 'before' | 'after' | 'photo' | 'receipt' | 'document';

export default function Files() {
  const { state } = useDemo();
  const d = state.data;
  const [svc, setSvc] = useState<'all' | ServiceType>('all');
  const [cat, setCat] = useState<Cat>('all');
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const [pickJob, setPickJob] = useState(false);
  const [jobId, setJobId] = useState('');
  const [uploadFor, setUploadFor] = useState<string | null>(null);
  const items = [...d.evidence].filter((e) => (svc === 'all' || e.service === svc) && (cat === 'all' || e.type === cat)).sort((a, b) => (a.at < b.at ? 1 : -1));
  const jobs = d.jobs.filter((j) => ACTIVE_STATUSES.includes(j.status) || j.status === 'completed');
  const job = getJob(d, uploadFor ?? undefined);

  return (
    <div>
      <PageHeader
        title="Files & Evidence"
        subtitle="Every photo, receipt and document — linked to the job and task it belongs to."
        actions={
          <>
            <Segmented label="Layout" value={layout} onChange={setLayout} options={[{ value: 'grid', label: <><Grid2x2 className="size-4" aria-hidden /> Gallery</> }, { value: 'list', label: <><List className="size-4" aria-hidden /> List</> }]} />
            <Button icon={<Upload className="size-4" />} onClick={() => { setJobId(jobs[0]?.id ?? ''); setPickJob(true); }}>
              Upload
            </Button>
          </>
        }
      />
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterChips label="Service" value={svc} onChange={setSvc} options={[{ value: 'all', label: 'All services' }, ...state.config.services.map((s) => ({ value: s.id, label: s.name, count: d.evidence.filter((e) => e.service === s.id).length }))]} />
        <FilterChips
          label="Category"
          value={cat}
          onChange={setCat}
          options={(['all', 'before', 'after', 'photo', 'receipt', 'document'] as Cat[]).map((c) => ({ value: c, label: c === 'all' ? 'All types' : c[0].toUpperCase() + c.slice(1), count: c === 'all' ? undefined : d.evidence.filter((e) => e.type === c).length }))}
        />
      </div>
      {!items.length ? (
        <EmptyState icon={Camera} title="No files match" />
      ) : layout === 'grid' ? (
        <EvidenceGrid items={items} cols="grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" />
      ) : (
        <div className="card divide-y divide-line">
          {items.map((e) => {
            const j = getJob(d, e.jobId);
            const t = getTask(d, e.taskId);
            return (
              <div key={e.id} className="flex items-center gap-3 p-3">
                {e.type === 'document' ? (
                  <span className="grid size-14 place-items-center rounded-lg bg-subtle text-muted">
                    <FileText className="size-6" aria-hidden />
                  </span>
                ) : (
                  <img src={asset(e.url)} alt="" className="size-14 rounded-lg object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{e.caption}</p>
                  <p className="truncate text-xs text-muted">
                    {j && (
                      <Link to={`/app/jobs/${j.id}?tab=evidence`} className="hover:text-secondary-ink">
                        {j.ref} · {j.title}
                      </Link>
                    )}
                    {t ? ` · ${t.title}` : ''} · {getCustomer(d, e.customerId)?.name ?? ''}
                  </p>
                </div>
                <span className="hidden text-xs font-bold uppercase text-muted sm:inline">{e.type}</span>
                <ServiceBadge service={e.service} short />
                <span className="hidden w-28 text-right text-xs text-muted md:inline">
                  {relativeDay(e.at)} {time(e.at)}
                </span>
              </div>
            );
          })}
        </div>
      )}
      <Modal
        open={pickJob}
        onClose={() => setPickJob(false)}
        title="Upload to a job"
        description="Files are always linked to a job (and optionally a task)."
        size="sm"
        footer={
          <Button
            disabled={!jobId}
            onClick={() => {
              setPickJob(false);
              setUploadFor(jobId);
            }}
          >
            Continue
          </Button>
        }
      >
        <SelectInput label="Job" value={jobId} onChange={(e) => setJobId(e.target.value)}>
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.ref} · {j.title}
            </option>
          ))}
        </SelectInput>
      </Modal>
      {job && <EvidenceDialog open onClose={() => setUploadFor(null)} job={job} tasks={tasksForJob(d, job.id)} by="w-sophie" />}
    </div>
  );
}
