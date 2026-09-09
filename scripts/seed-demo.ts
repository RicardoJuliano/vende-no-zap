/**
 * Popula (ou repopula) a conta de demonstração usada nas entrevistas de
 * validação. Roda com `npm run seed:demo`.
 *
 * Idempotente por reset: cada execução apaga os contatos (e, em cascata,
 * deals e anotações) que já existirem na conta demo e insere o dataset
 * de `src/lib/demo-dataset.ts` do zero. Rodar duas vezes não duplica —
 * deixa sempre no mesmo estado conhecido, o que é exatamente o que se
 * quer antes de uma demo ao vivo.
 *
 * Credenciais da conta demo vêm de variáveis de ambiente
 * (DEMO_ACCOUNT_EMAIL / DEMO_ACCOUNT_PASSWORD), nunca hardcoded — ver
 * .env.example e o README.
 */
import { createClient } from "@supabase/supabase-js";
import { buildDemoDataset } from "../src/lib/demo-dataset";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Faltou a variável de ambiente ${name}. Confira o .env.local (veja .env.example).`);
    process.exit(1);
  }
  return value;
}

async function main() {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const demoEmail = requireEnv("DEMO_ACCOUNT_EMAIL");
  const demoPassword = requireEnv("DEMO_ACCOUNT_PASSWORD");

  // Cliente admin (service_role): só pra achar/criar a conta demo. Nunca
  // usado pra gravar dado de negócio — isso passa pelo cliente autenticado
  // como a própria conta demo, abaixo, pra exercitar o RLS de verdade.
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`Procurando conta demo (${demoEmail})…`);
  const { data: existingProfile, error: profileLookupError } = await admin
    .from("profiles")
    .select("id")
    .eq("email", demoEmail)
    .maybeSingle();
  if (profileLookupError) {
    console.error("Não deu pra consultar profiles:", profileLookupError.message);
    process.exit(1);
  }
  let demoUserId: string | null = existingProfile?.id ?? null;

  if (!demoUserId) {
    console.log("Não existe ainda — criando…");
    const { data, error } = await admin.auth.admin.createUser({
      email: demoEmail,
      password: demoPassword,
      email_confirm: true,
      user_metadata: { name: "Conta Demo" },
    });
    if (error || !data.user) {
      console.error("Não deu pra criar a conta demo:", error?.message);
      process.exit(1);
    }
    demoUserId = data.user.id;
  } else {
    console.log("Já existe, reaproveitando.");
  }

  // Loga como a própria conta demo — os inserts abaixo passam pelas
  // mesmas policies de RLS que um usuário real enfrentaria.
  const asDemo = createClient(url, anonKey);
  const { error: signInError } = await asDemo.auth.signInWithPassword({
    email: demoEmail,
    password: demoPassword,
  });
  if (signInError) {
    console.error("Não deu pra logar como a conta demo:", signInError.message);
    process.exit(1);
  }

  console.log("Limpando dados antigos da conta demo…");
  const { error: wipeError } = await asDemo.from("contacts").delete().eq("user_id", demoUserId);
  if (wipeError) {
    console.error("Não deu pra limpar os dados antigos:", wipeError.message);
    process.exit(1);
  }

  const { contacts, deals, notes } = buildDemoDataset();

  console.log(`Inserindo ${contacts.length} contatos…`);
  const { data: insertedContacts, error: contactsError } = await asDemo
    .from("contacts")
    .insert(contacts.map((c) => ({ user_id: demoUserId, name: c.name, phone: c.phone })))
    .select("id");
  if (contactsError || !insertedContacts) {
    console.error("Não deu pra inserir os contatos:", contactsError?.message);
    process.exit(1);
  }

  // Todo objeto do array precisa ter exatamente as mesmas chaves: um
  // insert em lote do PostgREST vira um único INSERT ... VALUES (...),
  // (...) com uma lista de colunas fixa — uma chave ausente numa linha
  // não "usa o default da coluna", vira NULL explícito. Por isso
  // `updated_at` sempre entra, nunca condicional.
  const now = new Date().toISOString();
  console.log(`Inserindo ${deals.length} deals…`);
  const { error: dealsError } = await asDemo.from("deals").insert(
    deals.map((d) => ({
      user_id: demoUserId,
      contact_id: insertedContacts[d.contactIndex].id,
      title: d.title,
      stage: d.stage,
      value_cents: d.valueCents,
      updated_at: d.updatedAt ?? now,
    })),
  );
  if (dealsError) {
    console.error("Não deu pra inserir os deals:", dealsError.message);
    process.exit(1);
  }

  console.log(`Inserindo ${notes.length} anotações…`);
  const { error: notesError } = await asDemo.from("contact_notes").insert(
    notes.map((n) => ({
      user_id: demoUserId,
      contact_id: insertedContacts[n.contactIndex].id,
      body: n.body,
    })),
  );
  if (notesError) {
    console.error("Não deu pra inserir as anotações:", notesError.message);
    process.exit(1);
  }

  console.log("\n✅ Conta demo pronta.");
  console.log(`   Login: ${demoEmail}`);
  console.log(`   Senha: (a que está em DEMO_ACCOUNT_PASSWORD no seu .env.local)`);
}

main().catch((err) => {
  console.error("Erro inesperado ao rodar a seed:", err);
  process.exit(1);
});
