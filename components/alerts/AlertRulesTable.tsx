'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Play, Plus, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';
import { AlertRuleDialog, type AlertRuleDialogPayload, type UserOption } from '@/components/alerts/AlertRuleDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageEmptyState, PageErrorState, PageLoadingState } from '@/components/ui/page-states';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTimeForUi } from '@/lib/timezone';
import {
  ALERT_EVENT_LABELS,
  type AlertEvaluationStatus,
  type AlertRuleRecord,
} from '@/types/alerts';

type AlertRulesResponse = {
  rules: AlertRuleRecord[];
};

type UsersResponseRow = {
  id: string;
  ad: string;
  email: string;
  rol: 'admin' | 'yetkili';
};

type AlertStatusResponse = {
  status: AlertEvaluationStatus | null;
};

function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = window.localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function parseError(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') return fallback;
  const record = payload as { error?: string };
  return record.error ?? fallback;
}

function roleLabel(role: 'ADMIN' | 'YETKILI' | null): string {
  if (role === 'ADMIN') return 'Admin';
  if (role === 'YETKILI') return 'Yetkili';
  return '-';
}

function mapUsers(input: UsersResponseRow[] | null): UserOption[] {
  if (!input) return [];
  return input.map((row) => ({
    id: row.id,
    ad: row.ad,
    email: row.email,
    role: row.rol === 'admin' ? 'ADMIN' : 'YETKILI',
  }));
}

export function AlertRulesTable() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [rules, setRules] = useState<AlertRuleRecord[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [lastStatus, setLastStatus] = useState<AlertEvaluationStatus | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRuleRecord | null>(null);

  const sortedRules = useMemo(
    () =>
      [...rules].sort(
        (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
      ),
    [rules]
  );

  const loadAll = useCallback(async (silent?: boolean) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [rulesRes, usersRes, statusRes] = await Promise.all([
        fetch('/api/alerts/rules', {
          cache: 'no-store',
          headers: getAuthHeaders(),
        }),
        fetch('/api/users', {
          cache: 'no-store',
          headers: getAuthHeaders(),
        }),
        fetch('/api/alerts/status', {
          cache: 'no-store',
          headers: getAuthHeaders(),
        }),
      ]);

      const rulesBody = (await rulesRes.json().catch(() => null)) as AlertRulesResponse | null;
      const usersBody = (await usersRes.json().catch(() => null)) as UsersResponseRow[] | null;
      const statusBody = (await statusRes.json().catch(() => null)) as AlertStatusResponse | null;

      if (!rulesRes.ok) {
        throw new Error(parseError(rulesBody, 'Alert kurallari getirilemedi'));
      }
      if (!usersRes.ok) {
        throw new Error(parseError(usersBody, 'Kullanici listesi getirilemedi'));
      }
      if (!statusRes.ok) {
        throw new Error(parseError(statusBody, 'Alert status getirilemedi'));
      }

      setRules(rulesBody?.rules ?? []);
      setUsers(mapUsers(usersBody));
      setLastStatus(statusBody?.status ?? null);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Alert data yuklenemedi');
    } finally {
      if (silent) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const handleCreate = () => {
    setEditingRule(null);
    setDialogOpen(true);
  };

  const handleEdit = (rule: AlertRuleRecord) => {
    setEditingRule(rule);
    setDialogOpen(true);
  };

  const submitRule = async (payload: AlertRuleDialogPayload) => {
    setSubmitting(true);
    try {
      const isEdit = Boolean(editingRule);
      const endpoint = isEdit ? `/api/alerts/rules/${editingRule!.id}` : '/api/alerts/rules';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
      });

      const body = (await response.json().catch(() => null)) as AlertRuleRecord | null;
      if (!response.ok) {
        throw new Error(parseError(body, isEdit ? 'Alert kurali guncellenemedi' : 'Alert kurali olusturulamadi'));
      }

      toast.success(isEdit ? 'Alert kurali guncellendi' : 'Alert kurali olusturuldu');
      setDialogOpen(false);
      setEditingRule(null);
      await loadAll(true);
    } catch (submitError) {
      toast.error(submitError instanceof Error ? submitError.message : 'Alert kurali kaydedilemedi');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleRule = async (rule: AlertRuleRecord) => {
    setSubmitting(true);
    try {
      const response = await fetch(`/api/alerts/rules/${rule.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          aktif: !rule.aktif,
        }),
      });

      const body = (await response.json().catch(() => null)) as AlertRuleRecord | null;
      if (!response.ok) {
        throw new Error(parseError(body, 'Alert kurali guncellenemedi'));
      }

      setRules((current) => current.map((item) => (item.id === rule.id ? body! : item)));
      toast.success(rule.aktif ? 'Kural pasiflestirildi' : 'Kural aktiflestirildi');
    } catch (toggleError) {
      toast.error(toggleError instanceof Error ? toggleError.message : 'Kural durumu degistirilemedi');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteRule = async (rule: AlertRuleRecord) => {
    if (!window.confirm(`"${rule.ad}" kuralini silmek istiyor musunuz?`)) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/alerts/rules/${rule.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
      });

      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(parseError(body, 'Alert kurali silinemedi'));
      }

      setRules((current) => current.filter((item) => item.id !== rule.id));
      toast.success('Alert kurali silindi');
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : 'Alert kurali silinemedi');
    } finally {
      setSubmitting(false);
    }
  };

  const runEvaluate = async () => {
    setRunning(true);
    try {
      const response = await fetch('/api/alerts/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({}),
      });

      const body = (await response.json().catch(() => null)) as
        | {
            status?: AlertEvaluationStatus;
            error?: string;
          }
        | null;

      if (!response.ok) {
        throw new Error(parseError(body, 'Alert evaluate calistirilamadi'));
      }

      setLastStatus(body?.status ?? null);
      toast.success('Alert evaluation tamamlandi');
    } catch (runError) {
      toast.error(runError instanceof Error ? runError.message : 'Alert evaluate calistirilamadi');
    } finally {
      setRunning(false);
    }
  };

  if (loading) {
    return <PageLoadingState label="Alert kurallari yukleniyor..." />;
  }

  if (error) {
    return (
      <PageErrorState
        title="Alert kurallari yuklenemedi"
        description={error}
        onRetry={() => void loadAll()}
      />
    );
  }

  return (
    <section className="space-y-4" data-testid="alerts-rules-table">
      <div className="surface-panel space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Alert Rules</h3>
            <p className="text-sm text-muted-foreground">
              Ofis operasyonunda kritik olaylari role veya kullaniciya in-app bildirim olarak yonlendirin.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={() => void loadAll(true)} disabled={refreshing || submitting || running} data-testid="alerts-refresh">
              <RefreshCcw className="mr-2 h-4 w-4" />
              Yenile
            </Button>
            <Button type="button" onClick={() => void runEvaluate()} disabled={running || submitting} data-testid="alerts-evaluate-run">
              <Play className="mr-2 h-4 w-4" />
              {running ? 'Calisiyor...' : 'Evaluate'}
            </Button>
            <Button type="button" onClick={handleCreate} disabled={submitting || running} data-testid="alert-rule-create">
              <Plus className="mr-2 h-4 w-4" />
              Kural Ekle
            </Button>
          </div>
        </div>

        <div className="rounded-md border border-border/70 px-3 py-2 text-sm" data-testid="alerts-last-run">
          {lastStatus ? (
            <div className="grid gap-2 md:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Son calisma</p>
                <p className="font-medium">{formatDateTimeForUi(lastStatus.ranAt)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Olusan bildirim</p>
                <p className="font-medium">{lastStatus.createdCount}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Arsive alinan</p>
                <p className="font-medium">{lastStatus.archivedCount}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Kaynak</p>
                <p className="font-medium uppercase">{lastStatus.source}</p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">Alert evaluator henuz calistirilmadi.</p>
          )}
        </div>
      </div>

      <div className="surface-panel overflow-hidden p-4">
        {sortedRules.length === 0 ? (
          <PageEmptyState
            title="Alert kurali bulunmuyor"
            description="Ilk rule'u olusturarak otomatik bildirim akisini baslatin."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kural</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Hedef</TableHead>
                <TableHead>Kanal</TableHead>
                <TableHead>Aktif</TableHead>
                <TableHead>Guncellendi</TableHead>
                <TableHead className="text-right">Aksiyon</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRules.map((rule) => (
                <TableRow key={rule.id} data-testid={`alert-rule-row-${rule.id}`}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-foreground">{rule.ad}</p>
                      <p className="text-xs text-muted-foreground">
                        {rule.hedefUser ? `${rule.hedefUser.ad} (${rule.hedefUser.email})` : 'Rol bazli'}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{ALERT_EVENT_LABELS[rule.eventTipi]}</TableCell>
                  <TableCell>{rule.hedefUser ? rule.hedefUser.ad : roleLabel(rule.hedefRol)}</TableCell>
                  <TableCell>{rule.kanal}</TableCell>
                  <TableCell>
                    <Badge variant={rule.aktif ? 'default' : 'outline'}>{rule.aktif ? 'Aktif' : 'Pasif'}</Badge>
                  </TableCell>
                  <TableCell>{formatDateTimeForUi(rule.updatedAt)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => handleEdit(rule)} disabled={submitting || running} data-testid={`alert-rule-edit-${rule.id}`}>
                        Duzenle
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => void toggleRule(rule)} disabled={submitting || running} data-testid={`alert-rule-toggle-${rule.id}`}>
                        {rule.aktif ? 'Pasif' : 'Aktif'}
                      </Button>
                      <Button type="button" size="sm" variant="destructive" onClick={() => void deleteRule(rule)} disabled={submitting || running} data-testid={`alert-rule-delete-${rule.id}`}>
                        Sil
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <AlertRuleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        users={users}
        initialValue={editingRule}
        submitting={submitting}
        onSubmit={submitRule}
      />
    </section>
  );
}

export default AlertRulesTable;
