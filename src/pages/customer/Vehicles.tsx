import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Input, Modal, Select, useToast } from '@/components/ui';
import { EmptyState, Skeleton, ErrorState } from '@/components/feedback';
import { FadeIn, MotionCard } from '@/components/motion';
import { useAuth } from '@/app/AuthProvider';
import { listVehicles, addVehicle, updateVehicle, deleteVehicle, setDefaultVehicle, type Vehicle } from '@/lib/customer';

export function Vehicles() {
  const { user, configured } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [items, setItems] = useState<Vehicle[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [plate, setPlate] = useState('');
  const [type, setType] = useState<Vehicle['type']>('car');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Vehicle | null>(null);
  const [editMake, setEditMake] = useState('');
  const [editModel, setEditModel] = useState('');
  const [editYear, setEditYear] = useState<number>(new Date().getFullYear());
  const [editPlate, setEditPlate] = useState('');
  const [editType, setEditType] = useState<Vehicle['type']>('car');
  const [editErr, setEditErr] = useState<string | null>(null);
  const [rowBusy, setRowBusy] = useState<string | null>(null);

  const startEdit = (v: Vehicle) => {
    setEditingId(v.id);
    setEditMake(v.make);
    setEditModel(v.model);
    setEditYear(v.year);
    setEditPlate(v.plate);
    setEditType(v.type);
    setEditErr(null);
  };

  useEffect(() => {
    if (!user) { navigate('/login?mode=signin', { replace: true }); return; }
    let cancelled = false;
    listVehicles(user.uid).then((v) => { if (!cancelled) setItems(v); });
    return () => { cancelled = true; };
  }, [user, navigate]);

  if (!user) return null;

  const onAdd = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const v = await addVehicle(user.uid, { make, model, year, plate, type });
      if (!v) {
        setErr(configured ? 'Could not save. Try again.' : 'Firebase is not configured — your vehicle is not saved.');
        return;
      }
      setItems((prev) => (prev ? [v, ...prev] : [v]));
      setMake(''); setModel(''); setPlate(''); setYear(new Date().getFullYear()); setType('car');
      setAdding(false);
      toast.push({ title: 'Vehicle added', tone: 'success' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="container section-compact">
      <FadeIn>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-fg-muted">Vehicles</div>
            <h1 className="mt-2 display text-display-md text-fg-app">Your vehicles</h1>
          </div>
          <Button variant="primary" onClick={() => setAdding((v) => !v)}>
            {adding ? 'Close' : 'Add vehicle'}
          </Button>
        </div>
      </FadeIn>

      {adding && (
        <div className="mt-6 max-w-2xl">
          <Card>
            <h2 className="text-h2 text-fg-app">Add a vehicle</h2>
            <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={onAdd}>
              <Select label="Type" value={type} onChange={(e) => setType(e.target.value as Vehicle['type'])}>
                <option value="car">Car</option>
                <option value="bike">Motorbike</option>
                <option value="van">Van</option>
                <option value="truck">Truck</option>
              </Select>
              <Input label="Make"  name="make"  required autoComplete="off" value={make}   onChange={(e) => setMake(e.target.value)} />
              <Input label="Model" name="model" required autoComplete="off" value={model}  onChange={(e) => setModel(e.target.value)} />
              <Input label="Year"  name="year"  type="number" inputMode="numeric" min={1950} max={new Date().getFullYear() + 1} required autoComplete="off" value={year} onChange={(e) => setYear(Number(e.target.value))} />
              <Input label="Plate" name="plate" required autoComplete="off" value={plate}  onChange={(e) => setPlate(e.target.value)} className="sm:col-span-2" />
              {err && <p role="alert" className="sm:col-span-2 text-small text-danger-500">{err}</p>}
              <div className="sm:col-span-2">
                <Button type="submit" variant="primary" loading={busy}>Save vehicle</Button>
              </div>
            </form>
            {!configured && (
              <p className="mt-4 text-xs text-warning-600">
                Firebase is not configured. The form submits, but nothing is saved remotely.
              </p>
            )}
          </Card>
        </div>
      )}

      <div className="mt-8">
        {items === null ? (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
        ) : items.length === 0 ? (
          <EmptyState compact kind="vehicles" onAction={() => setAdding(true)} />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {items.map((v) => (
              <MotionCard key={v.id} lift="sm" className="p-5">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand-500/15 text-brand-500 text-h3">
                    {v.type === 'bike' ? '🏍' : v.type === 'van' ? '🚐' : v.type === 'truck' ? '🚚' : '🚗'}
                  </div>
                  <div>
                    <div className="text-body font-medium text-fg-app">{v.make} {v.model}</div>
                    <div className="text-xs text-fg-muted">{v.year} · {v.plate}</div>
                  </div>
                  {v.isDefault && (
                    <span className="ml-auto rounded-full bg-success-500/15 px-2 py-0.5 text-xs font-semibold text-success-600">
                      Default
                    </span>
                  )}
                </div>
                {editingId === v.id ? (
                  <form
                    className="mt-4 grid gap-3 sm:grid-cols-2"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!user) return;
                      const maxYear = new Date().getFullYear() + 1;
                      if (!editMake.trim() || !editModel.trim() || !editPlate.trim()) {
                        setEditErr('Make, model and plate are required.');
                        return;
                      }
                      if (!Number.isFinite(editYear) || editYear < 1950 || editYear > maxYear) {
                        setEditErr(`Year must be between 1950 and ${maxYear}.`);
                        return;
                      }
                      setEditErr(null);
                      setRowBusy(v.id);
                      const patch = { make: editMake.trim(), model: editModel.trim(), year: editYear, plate: editPlate.trim(), type: editType };
                      const ok = await updateVehicle(v.id, patch);
                      setRowBusy(null);
                      if (!ok) { toast.push({ title: 'Could not save vehicle', tone: 'danger' }); return; }
                      setItems((prev) => prev?.map((x) => (x.id === v.id ? { ...x, ...patch } : x)) ?? null);
                      setEditingId(null);
                      toast.push({ title: 'Vehicle updated', tone: 'success' });
                    }}
                  >
                    <Select label="Type" value={editType} onChange={(e) => setEditType(e.target.value as Vehicle['type'])}>
                      <option value="car">Car</option>
                      <option value="bike">Motorbike</option>
                      <option value="van">Van</option>
                      <option value="truck">Truck</option>
                    </Select>
                    <Input label="Year" type="number" inputMode="numeric" min={1950} max={new Date().getFullYear() + 1} required autoComplete="off" value={editYear} onChange={(e) => setEditYear(Number(e.target.value))} />
                    <Input label="Make" value={editMake} onChange={(e) => setEditMake(e.target.value)} required autoComplete="off" />
                    <Input label="Model" value={editModel} onChange={(e) => setEditModel(e.target.value)} required autoComplete="off" />
                    <Input label="Plate" value={editPlate} onChange={(e) => setEditPlate(e.target.value)} required autoComplete="off" className="sm:col-span-2" />
                    {editErr && <p role="alert" className="sm:col-span-2 text-small text-danger-500">{editErr}</p>}
                    <div className="flex gap-2 sm:col-span-2">
                      <Button type="submit" size="sm" loading={rowBusy === v.id}>Save</Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setEditingId(null)}>Cancel</Button>
                    </div>
                  </form>
                ) : (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {!v.isDefault && (
                      <Button
                        size="sm"
                        variant="secondary"
                        loading={rowBusy === `def-${v.id}`}
                        onClick={async () => {
                          if (!user) return;
                          setRowBusy(`def-${v.id}`);
                          const ok = await setDefaultVehicle(user.uid, v.id);
                          setRowBusy(null);
                          if (!ok) { toast.push({ title: 'Could not set default', tone: 'danger' }); return; }
                          setItems((prev) => prev?.map((x) => ({ ...x, isDefault: x.id === v.id })) ?? null);
                          toast.push({ title: 'Default vehicle set', tone: 'success' });
                        }}
                      >
                        Set default
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => startEdit(v)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleting(v)}
                    >
                      Delete
                    </Button>
                  </div>
                )}
              </MotionCard>
            ))}
          </div>
        )}
        {err && <div className="mt-4"><ErrorState kind="api" title="Could not save" description={err} /></div>}
      </div>

      <Modal
        open={deleting !== null}
        onClose={() => { if (rowBusy === null) setDeleting(null); }}
        title="Delete this vehicle?"
        description={deleting ? `${deleting.year} ${deleting.make} ${deleting.model} (${deleting.plate}) will be removed. Your request history is unaffected.` : undefined}
        footer={
          <>
            <Button variant="secondary" disabled={rowBusy !== null} onClick={() => setDeleting(null)}>Keep vehicle</Button>
            <Button
              variant="danger" loading={rowBusy !== null}
              onClick={async () => {
                if (!deleting) return;
                setRowBusy(deleting.id);
                const ok = await deleteVehicle(deleting.id);
                setRowBusy(null);
                if (!ok) { toast.push({ title: 'Could not delete', tone: 'danger' }); return; }
                setItems((prev) => prev?.filter((x) => x.id !== deleting.id) ?? null);
                setDeleting(null);
                toast.push({ title: 'Vehicle deleted', tone: 'success' });
              }}
            >
              Delete vehicle
            </Button>
          </>
        }
      >
        <p className="text-small text-fg-muted">This can't be undone.</p>
      </Modal>
    </main>
  );
}
