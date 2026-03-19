import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import {
  Eye, EyeOff, Copy, Check, ShieldAlert, Key, Download,
  Loader2, Code2, Database, AlertTriangle, Info, ArrowLeft,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TableRaw {
  name: string;
  row_count: number;
  column_count: number;
  encrypted_columns: string | null;
  has_user_id: boolean;
}

interface CredentialsData {
  project_url: string | null;
  anon_key: string | null;
  service_role_key: string | null;
  secrets: Record<string, string>;
  edge_functions: string[];
  edge_functions_count: number;
  database_tables?: TableRaw[];
}

function maskValue(val: string) {
  if (!val || val.length < 24) return '••••••••••••';
  return val.slice(0, 12) + '•••••' + val.slice(-8);
}

function classifyTable(t: TableRaw): { label: string; color: string; reason: string } {
  const n = t.name.toLowerCase();
  if (/_log|_history|migration|audit/.test(n) || t.encrypted_columns) {
    return { label: 'Ignorar', color: 'bg-muted text-muted-foreground', reason: t.encrypted_columns ? 'Contém colunas criptografadas' : 'Tabela de log/histórico/migração' };
  }
  if (/settings|config|role/.test(n) || (n === 'profiles' && t.has_user_id) || (t.has_user_id && t.row_count < 50 && /credit|subscription/.test(n))) {
    return { label: 'Essencial', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', reason: /role/.test(n) ? 'Tabela de roles/permissões' : /config|settings/.test(n) ? 'Tabela de configuração' : 'Tabela de perfis de usuário' };
  }
  if (/payment|sale|transaction|order/.test(n)) {
    return { label: 'Histórico', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', reason: 'Tabela transacional/financeira' };
  }
  if (t.has_user_id && /profiles|user_roles/.test(n)) {
    return { label: 'Essencial', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', reason: 'Tabela essencial de usuários' };
  }
  return { label: 'Histórico', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', reason: 'Tabela de dados geral' };
}

// Import edge function sources at build time
const edgeFunctionModules = import.meta.glob('../../supabase/functions/*/index.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

export default function AdminCredentialsPage() {
  const { session } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [data, setData] = useState<CredentialsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<Record<string, boolean>>({});

  const fetchCredentials = async () => {
    if (!session?.access_token) return;
    setLoading(true);
    try {
      const { data: res, error } = await supabase.functions.invoke('admin-credentials', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      setData(res as CredentialsData);
      toast({ title: 'Credenciais carregadas com sucesso' });
    } catch (e: any) {
      toast({ title: 'Erro ao carregar credenciais', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const toggleReveal = (key: string) => setRevealed(p => ({ ...p, [key]: !p[key] }));

  const copyToClipboard = async (key: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(p => ({ ...p, [key]: true }));
    setTimeout(() => setCopied(p => ({ ...p, [key]: false })), 2000);
  };

  const allEntries = useMemo(() => {
    if (!data) return [];
    const entries: [string, string][] = [];
    if (data.project_url) entries.push(['SUPABASE_URL', data.project_url]);
    if (data.anon_key) entries.push(['SUPABASE_ANON_KEY', data.anon_key]);
    if (data.service_role_key) entries.push(['SUPABASE_SERVICE_ROLE_KEY', data.service_role_key]);
    Object.entries(data.secrets).forEach(([k, v]) => entries.push([k, v]));
    return entries;
  }, [data]);

  const copyAll = async () => {
    const lines = [
      '═══════════════════════════════════',
      '   CREDENCIAIS DO PROJETO',
      '═══════════════════════════════════',
      '',
      '── Credenciais Principais ──',
      `SUPABASE_URL=${data?.project_url || ''}`,
      `SUPABASE_ANON_KEY=${data?.anon_key || ''}`,
      `SUPABASE_SERVICE_ROLE_KEY=${data?.service_role_key || ''}`,
      '',
      '── Secrets Extras ──',
      ...Object.entries(data?.secrets || {}).map(([k, v]) => `${k}=${v}`),
      '',
      '═══════════════════════════════════',
    ];
    await navigator.clipboard.writeText(lines.join('\n'));
    toast({ title: 'Todas as credenciais copiadas!' });
  };

  const downloadSecretsTs = () => {
    const now = new Date();
    const dateStr = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;
    const entries: string[] = [];
    if (data?.project_url) entries.push(`  SUPABASE_URL: "${data.project_url}",`);
    if (data?.anon_key) entries.push(`  SUPABASE_ANON_KEY: "${data.anon_key}",`);
    if (data?.service_role_key) entries.push(`  SUPABASE_SERVICE_ROLE_KEY: "${data.service_role_key}",`);
    Object.entries(data?.secrets || {}).forEach(([k, v]) => entries.push(`  ${k}: "${v}",`));
    const content = `// Secrets do projeto - Gerado em ${dateStr}\nexport const SECRETS = {\n${entries.join('\n')}\n} as const;\nexport type SecretKey = keyof typeof SECRETS;\n`;
    const blob = new Blob([content], { type: 'text/typescript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'secrets.ts';
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Arquivo secrets.ts baixado!' });
  };

  const downloadEdgeFunctionsTs = () => {
    const entries = Object.entries(edgeFunctionModules);
    if (!entries.length) {
      toast({ title: 'Nenhuma edge function encontrada no build', variant: 'destructive' });
      return;
    }
    const parts = entries.map(([path, code]) => {
      const name = path.split('/').slice(-2, -1)[0];
      return `// ═══════════════════════════════════\n// Edge Function: ${name}\n// ═══════════════════════════════════\n\n${code}`;
    });
    const content = `// Edge Functions do projeto - Consolidado\n// Total: ${entries.length} funções\n\n${parts.join('\n\n')}`;
    const blob = new Blob([content], { type: 'text/typescript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'edge-functions.ts';
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: `${entries.length} edge functions exportadas!` });
  };

  const credCount = data ? [data.project_url, data.anon_key, data.service_role_key].filter(Boolean).length : 0;
  const secretCount = data ? Object.keys(data.secrets).length : 0;
  const tables = data?.database_tables || [];
  const hasUserTables = tables.some(t => /profiles|user_roles/.test(t.name.toLowerCase()));

  const CredRow = ({ label, value }: { label: string; value: string }) => (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <div className="flex-1 min-w-0">
        <span className="text-xs font-mono text-muted-foreground">{label}</span>
        <p className="text-sm font-mono truncate">{revealed[label] ? value : maskValue(value)}</p>
      </div>
      <div className="flex gap-1 ml-2 shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleReveal(label)}>
          {revealed[label] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyToClipboard(label, value)}>
          {copied[label] ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Credenciais do Projeto</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <ShieldAlert className="h-8 w-8 text-destructive shrink-0" />
            <div>
              <p className="text-2xl font-bold">{credCount}</p>
              <p className="text-xs text-muted-foreground">Credenciais</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Key className="h-8 w-8 text-primary shrink-0" />
            <div>
              <p className="text-2xl font-bold">{secretCount}</p>
              <p className="text-xs text-muted-foreground">Secrets</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Code2 className="h-8 w-8 text-primary shrink-0" />
            <div>
              <p className="text-2xl font-bold">{data?.edge_functions_count ?? '—'}</p>
              <p className="text-xs text-muted-foreground">Edge Functions</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Database className="h-8 w-8 text-primary shrink-0" />
            <div>
              <p className="text-2xl font-bold">{tables.length || '—'}</p>
              <p className="text-xs text-muted-foreground">Tabelas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Button onClick={fetchCredentials} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
          Revelar Tudo
        </Button>
        {data && (
          <>
            <Button variant="outline" onClick={copyAll}>
              <Copy className="h-4 w-4 mr-2" /> Copiar Tudo
            </Button>
            <Button variant="outline" onClick={downloadSecretsTs}>
              <Download className="h-4 w-4 mr-2" /> Download .ts
            </Button>
          </>
        )}
      </div>

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Credentials Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShieldAlert className="h-5 w-5 text-destructive" /> Credenciais
              </CardTitle>
              <CardDescription>Project URL, Anon Key, Service Role Key</CardDescription>
            </CardHeader>
            <CardContent>
              {data.project_url && <CredRow label="SUPABASE_URL" value={data.project_url} />}
              {data.anon_key && <CredRow label="SUPABASE_ANON_KEY" value={data.anon_key} />}
              {data.service_role_key && <CredRow label="SUPABASE_SERVICE_ROLE_KEY" value={data.service_role_key} />}
            </CardContent>
          </Card>

          {/* Secrets Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Key className="h-5 w-5 text-primary" /> Secrets
              </CardTitle>
              <CardDescription>Variáveis de ambiente extras</CardDescription>
            </CardHeader>
            <CardContent>
              {Object.entries(data.secrets).length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">Nenhum secret extra configurado.</p>
              ) : (
                Object.entries(data.secrets).map(([k, v]) => <CredRow key={k} label={k} value={v} />)
              )}
            </CardContent>
          </Card>

          {/* Edge Functions Card */}
          <Card className="md:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Code2 className="h-5 w-5 text-primary" /> Edge Functions ({data.edge_functions_count})
                </CardTitle>
                <Button variant="outline" size="sm" onClick={downloadEdgeFunctionsTs}>
                  <Download className="h-4 w-4 mr-1" /> Download .ts
                </Button>
              </div>
              <CardDescription>Funções descobertas via probe</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {data.edge_functions.map(fn => (
                  <Badge key={fn} variant="secondary" className="font-mono text-xs">{fn}</Badge>
                ))}
                {data.edge_functions.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhuma edge function encontrada.</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Database Tables Card */}
          <Card className="md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Database className="h-5 w-5 text-primary" /> Tabelas do Banco ({tables.length})
              </CardTitle>
              <CardDescription>Classificação automática por heurísticas</CardDescription>
            </CardHeader>
            <CardContent>
              {hasUserTables && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 mb-4">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    Usuários migrados precisam redefinir a senha via "Esqueci minha senha". Emails e metadados são copiados, mas senhas são hashes irreversíveis.
                  </p>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {tables.map(t => {
                  const cls = classifyTable(t);
                  return (
                    <Tooltip key={t.name}>
                      <TooltipTrigger>
                        <Badge className={`${cls.color} font-mono text-xs cursor-help`}>
                          {t.name}
                          <span className="ml-1 opacity-60">({t.row_count}r/{t.column_count}c)</span>
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="font-semibold">{cls.label}</p>
                        <p className="text-xs">{cls.reason}</p>
                        <p className="text-xs mt-1">{t.row_count} registros, {t.column_count} colunas</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
