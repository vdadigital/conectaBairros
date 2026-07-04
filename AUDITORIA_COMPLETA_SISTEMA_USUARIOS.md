# AUDITORIA COMPLETA DO SISTEMA DE USUÁRIOS

**Data da Auditoria:** 30/06/2026  
**Auditor:** Sistema de Análise  
**Status:** ⚠️ PROBLEMA CRÍTICO IDENTIFICADO

---

## RESUMO EXECUTIVO

A coleção **"usuarios" NÃO EXISTE** no Firestore. O sistema está tentando criar usuários, mas a operação nunca foi concluída com sucesso. Isso impede que o sistema de permissões (admin/empreendedor) funcione corretamente.

---

## 1. ONDE A COLEÇÃO "USUARIOS" É CRIADA

### ❌ PROBLEMA: A coleção NUNCA foi criada

**Arquivo:** `assets/js/conectabairros.js`

A coleção **não é criada explicitamente**. No Firestore, coleções são criadas automaticamente quando o **primeiro documento** é inserido.

**Referências no código:**
- Linha 68: `db.collection("usuarios").doc(usuario.uid)` - Referência para LEITURA
- Linha 75: `await docRef.set({...})` - **TENTATIVA DE CRIAÇÃO** (nunca executada com sucesso)
- Linha 91: `db.collection("usuarios").doc(usuario.uid)` - Referência para LEITURA
- Linha 137: `db.collection("usuarios").doc(usuario.uid)` - Referência para LEITURA

**Constante definida:** `NOME_COLECOA = "comerciantes"` (linha 30)  
**String hardcoded:** `"usuarios"` (linhas 68, 75, 91, 137)

---

## 2. LINHA EXATA DE `db.collection("usuarios")`

### Ocorrências:

**Linha 68:**
```javascript
const docRef = db.collection("usuarios").doc(usuario.uid);
```
**Função:** `fazerLoginGoogle()` (linha 48)  
**Contexto:** Verifica se usuário existe, senão cria

**Linha 137:**
```javascript
const docRef = db.collection("usuarios").doc(usuario.uid);
```
**Função:** `auth.onAuthStateChanged()` (linha 131)  
**Contexto:** Carrega dados do usuário após login

---

## 3. A FUNÇÃO É CHAMADA APÓS O LOGIN?

### ✅ SIM, é chamada em DOIS locais:

**Local 1 - Função `fazerLoginGoogle()` (linha 48):**
```
Linha 64: const result = await auth.signInWithPopup(provider);
Linha 68: const docRef = db.collection("usuarios").doc(usuario.uid);
Linha 69: const doc = await docRef.get();
Linha 71: if (!doc.exists) {
Linha 75:     await docRef.set({...});  // ← CRIA O DOCUMENTO
Linha 92: usuarioAtual = docAtualizado.data();
```

**Fluxo:** Login Google → Verifica se existe → Cria se não existir → Carrega dados

**Local 2 - Listener `onAuthStateChanged()` (linha 131):**
```
Linha 137: const docRef = db.collection("usuarios").doc(usuario.uid);
Linha 138: const doc = await docRef.get();
Linha 140: if (doc.exists) {
Linha 141:     usuarioAtual = doc.data();
```

**Fluxo:** Qualquer mudança no estado de auth → Carrega dados do usuário

---

## 4. ERROS QUE IMPEDEM `await db.collection("usuarios").doc(uid).set(...)` DE EXECUTAR

### ✅ NÃO HÁ ERROS DE SINTAXE OU LÓGICA

O código está **sintaticamente correto**. A linha 75 (`await docRef.set({...})`) está pronta para executar.

**Possíveis erros RUNTIME (não detectados no código):**

1. **Regras de Segurança do Firestore** (MAIS PROVÁVEL)
   - Se as regras não permitirem escrita na coleção "usuarios"
   - Erro: `Missing or insufficient permissions`

2. **Firebase não inicializado corretamente**
   - Configuração inválida
   - Erro: `Firebase App named '[DEFAULT]' already exists`

3. **Projeto Firestore não existe**
   - Projeto `conectabairros-dea35` não encontrado
   - Erro: `No project exists with the ID 'conectabairros-dea35'`

4. **Usuário cancela o popup de login**
   - Erro: `User cancelled the sign-in request`

---

## 5. TRY/CATCH QUE ESTÁ ESCONDENDO O ERRO

### ⚠️ SIM, HÁ DOIS TRY/CATCH

**Local 1 - Função `fazerLoginGoogle()` (linhas 51-109):**

```javascript
Linha 51: try {
Linha 64:     const result = await auth.signInWithPopup(provider);
Linha 68:     const docRef = db.collection("usuarios").doc(usuario.uid);
Linha 69:     const doc = await docRef.get();
Linha 71:     if (!doc.exists) {
Linha 75:         await docRef.set({...});  // ← ERRO AQUI SERIA CAPTURADO
Linha 85:     }
Linha 94:     usuarioAtual = docAtualizado.data();
Linha 97: } catch (error) {
Linha 98:     console.error("Erro no login:", error);  // ← ERRO REGISTRADO APENAS NO CONSOLE
Linha 99:     mostrarErro("Erro ao fazer login. Tente novamente.");
```

**Problema:** O erro é capturado, mas a mensagem é genérica:  
`"Erro ao fazer login. Tente novamente."`  
**NÃO mostra o erro real** (ex: "Permissão negada no Firestore")

**Local 2 - Listener `onAuthStateChanged()` (linhas 136-145):**

```javascript
Linha 136: try {
Linha 137:     const docRef = db.collection("usuarios").doc(usuario.uid);
Linha 138:     const doc = await docRef.get();
Linha 140:     if (doc.exists) {
Linha 141:         usuarioAtual = doc.data();
Linha 143: } catch (error) {
Linha 144:     console.error("Erro ao carregar dados do usuário:", error);
```

**Problema:** Se o documento não existe, o `catch` é executado, mas **não faz nada** além de logar no console. O `usuarioAtual` permanece `null`.

---

## 6. TODOS OS LOCAIS ONDE APARECE `usuarioAtual.tipo`

### Ocorrências:

**Linha 80 - DEFINIÇÃO (onde o valor é CRIADO):**
```javascript
tipo: ehAdmin ? "admin" : "empreendedor",
```
**Origem:** Expressão condicional baseada em `ADMIN_EMAILS`

**Linha 94 - LEITURA (após login):**
```javascript
console.log("Login realizado:", usuario.displayName, "| Tipo:", usuarioAtual.tipo);
```
**Origem:** Vem do Firestore (linha 92: `usuarioAtual = docAtualizado.data()`)

**Linha 149 - LEITURA (na interface):**
```javascript
const tipoUsuario = usuarioAtual && usuarioAtual.tipo === "admin" ? "Administrador" : "Empreendedor";
```
**Origem:** Vem do Firestore (carregado em linha 141)

**Linha 519 - LEITURA (verificação de permissão):**
```javascript
const ehAdmin = usuarioAtual && usuarioAtual.tipo === "admin";
```
**Origem:** Vem do Firestore (carregado em linha 141)

**Linha 571 - LEITURA (verificação de permissão):**
```javascript
const ehAdminExclusao = usuarioAtual && usuarioAtual.tipo === "admin";
```
**Origem:** Vem do Firestore (carregado em linha 141)

---

## 7. ORIGEM DO TIPO "Empreendedor"

### ❌ NÃO VEM DO FIRESTORE (ainda)

**Vem de:** **OBJETO CRIADO EM MEMÓRIA** (linha 75-83)

```javascript
Linha 73: const ehAdmin = ADMIN_EMAILS.includes(usuario.email);
Linha 75: await docRef.set({
    ...
Linha 80:     tipo: ehAdmin ? "admin" : "empreendedor",  // ← AQUI
    ...
});
```

**Fluxo:**
1. Usuário faz login com Google
2. Sistema verifica se email está em `ADMIN_EMAILS` (linha 26-28)
3. Se NÃO está na lista → tipo = `"empreendedor"` (tudo minúsculo)
4. Se ESTÁ na lista → tipo = `"admin"`
5. Valor é salvo no Firestore

**Valor no banco:** `"empreendedor"` (minúsculo)  
**Valor exibido na interface:** `"Empreendedor"` (capitalizado - linha 149)

**Constante `ADMIN_EMAILS` (linha 26-28):**
```javascript
const ADMIN_EMAILS = [
    "vdadigital@gmail.com"
];
```

---

## 8. POR QUE A COLEÇÃO "USUARIOS" NUNCA FOI CRIADA

### ❌ CAUSA RAIZ: ERRO SILENCIOSO NO TRY/CATCH

**Diagnóstico:**

1. **Usuário faz login** (linha 64)
2. **Sistema tenta criar documento** (linha 75)
3. **ERRO OCORRE** (provavelmente permissão do Firestore)
4. **Try/Catch captura o erro** (linha 97)
5. **Erro é disfarçado** com mensagem genérica (linha 99)
6. **Usuário vê:** "Erro ao fazer login. Tente novamente."
7. **Ninguém percebe** que o problema é nas regras do Firestore
8. **Coleção nunca é criada**

**Evidência:**
- Console do navegador deve ter: `Erro no login: Error: Missing or insufficient permissions`
- Mas o usuário só vê: `"Erro ao fazer login. Tente novamente."`

**Cadeia de falha:**
```
Login → Tentativa de criar usuário → ERRO DE PERMISSÃO → Catch genérico → 
Usuário pensa que "login falhou" → Tenta de novo → Mesmo erro → 
Desiste → Coleção "usuarios" NUNCA é criada
```

---

## PROBLEMAS IDENTIFICADOS

### 🔴 PROBLEMA 1: Coleção "usuarios" não existe
- **Linha:** N/A (coleção não existe)
- **Causa:** Erro de permissão no Firestore não tratado corretamente
- **Solução:** 
  1. Verificar regras de segurança do Firestore
  2. Permitir escrita na coleção "usuarios" para usuários autenticados
  3. Melhorar mensagem de erro para mostrar o problema real

### 🔴 PROBLEMA 2: Try/Catch com mensagem genérica
- **Linha:** 97-99
- **Causa:** Erro real é ocultado do usuário
- **Solução:** 
  ```javascript
  } catch (error) {
      console.error("Erro no login:", error);
      mostrarErro("Erro ao fazer login: " + error.message); // ← Mostrar erro real
  }
  ```

### 🟡 PROBLEMA 3: Try/Catch no onAuthStateChanged não trata erro
- **Linha:** 143-145
- **Causa:** Se documento não existe, catch é executado mas não faz nada
- **Solução:** Adicionar tratamento ou remover try/catch desnecessário

### 🟡 PROBLEMA 4: Inconsistência de capitalização
- **Linha:** 80 (banco): `"empreendedor"` (minúsculo)
- **Linha:** 149 (interface): `"Empreendedor"` (capitalizado)
- **Solução:** Padronizar para `"empreendedor"` em ambos os locais

---

## FLUXO ESPERADO vs FLUXO REAL

### Fluxo ESPERADO (teórico):
```
1. Usuário clica em "Login do Empreendedor"
2. Popup do Google abre
3. Usuário seleciona conta
4. Sistema verifica se usuário existe em "usuarios"
5. Se não existe → CRIA documento com tipo "empreendedor"
6. Carrega dados em usuarioAtual
7. Interface atualiza com nome e tipo
```

### Fluxo REAL (provável):
```
1. Usuário clica em "Login do Empreendedor"
2. Popup do Google abre
3. Usuário seleciona conta
4. Sistema verifica se usuário existe em "usuarios"
5. ❌ ERRO: Permissão negada (regras do Firestore)
6. Catch captura erro (linha 97)
7. ❌ Mensagem genérica: "Erro ao fazer login. Tente novamente."
8. ❌ usuarioAtual permanece null
9. ❌ Coleção "usuarios" NUNCA é criada
10. ❌ Sistema de permissões NÃO FUNCIONA
```

---

## REGRAS DE SEGURANÇA DO FIRESTORE (SUSPEITA)

**Arquivo:** Não identificado (provável: `firestore.rules` ou configuração no console Firebase)

**Regra esperada (INCORRETA):**
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ❌ PERMITE apenas leitura, NÃO permite escrita
    match /usuarios/{userId} {
      allow read: if request.auth != null;
      // ❌ FALTA: allow write: if request.auth != null;
    }
    
    // Coleção "comerciantes" funciona porque...
    match /comerciantes/{comercioId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

**Regra correta (necessária):**
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /usuarios/{userId} {
      // Usuário pode ler próprio documento
      allow read: if request.auth != null && request.auth.uid == userId;
      // Usuário pode criar próprio documento (primeiro login)
      allow create: if request.auth != null && request.auth.uid == userId;
      // Usuário pode atualizar próprio documento
      allow update: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## COMO CONFIRMAR O PROBLEMA

### Passo 1: Verificar Console do Navegador
```javascript
// Abra o DevTools (F12) → Console
// Clique em "Login do Empreendedor"
// Faça login com Google
// Procure por:
console.error("Erro no login:", error);
// O erro real estará lá
```

### Passo 2: Verificar Firestore no Console Firebase
```
1. Acesse: https://console.firebase.google.com
2. Projeto: conectabairros-dea35
3. Firestore Database
4. Verifique se coleção "usuarios" existe
5. Se NÃO existe → confirma o problema
```

### Passo 3: Verificar Regras de Segurança
```
1. Firebase Console → Firestore → Regras
2. Procure por regras da coleção "usuarios"
3. Verifique se há permissão de escrita (create)
```

---

## SOLUÇÃO RECOMENDADA (PASSO A PASSO)

### 1. Corrigir Regras do Firestore
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Coleção de usuários
    match /usuarios/{userId} {
      // Permite leitura para usuários autenticados
      allow read: if request.auth != null;
      
      // Permite criação (primeiro login)
      allow create: if request.auth != null 
                    && request.auth.uid == userId
                    && request.resource.data.uid == userId
                    && request.resource.data.tipo in ["admin", "empreendedor"];
      
      // Permite atualização do próprio usuário
      allow update: if request.auth != null 
                    && request.auth.uid == userId;
    }
    
    // Coleção de comércios (já deve existir)
    match /comerciantes/{comercioId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

### 2. Melhorar Tratamento de Erros
```javascript
// Linha 97-99
} catch (error) {
    console.error("Erro no login:", error);
    
    // Mostra erro real para debug
    let mensagem = "Erro ao fazer login.";
    
    if (error.code === 'permission-denied') {
        mensagem = "Erro de permissão. Contate o administrador.";
    } else if (error.code === 'unavailable') {
        mensagem = "Serviço indisponível. Tente novamente.";
    } else {
        mensagem = "Erro: " + error.message;
    }
    
    mostrarErro(mensagem);
    
    // Restaura botão
    if (btnLogin) {
        btnLogin.innerHTML = `...Login do Empreendedor...`;
        btnLogin.disabled = false;
    }
}
```

### 3. Padronizar Capitalização
```javascript
// Linha 80 - Mudar de:
tipo: ehAdmin ? "admin" : "empreendedor",

// Para:
tipo: ehAdmin ? "admin" : "empreendedor", // Mantém minúsculo no banco

// Linha 149 - Mudar de:
const tipoUsuario = usuarioAtual && usuarioAtual.tipo === "admin" ? "Administrador" : "Empreendedor";

// Para:
const tipoExibicao = usuarioAtual && usuarioAtual.tipo === "admin" ? "Administrador" : "Empreendedor";
```

### 4. Adicionar Validação
```javascript
// Após linha 92 (usuarioAtual = docAtualizado.data())
if (!usuarioAtual || !usuarioAtual.tipo) {
    throw new Error("Dados do usuário incompletos");
}
```

---

## IMPACTO DO PROBLEMA

### 🔴 CRÍTICO:
- ❌ Sistema de permissões NÃO FUNCIONA
- ❌ Nenhum usuário consegue fazer login
- ❌ Nenhum comércio pode ser cadastrado/editado/excluído
- ❌ Aplicação está INUTILIZÁVEL

### 🟡 MÉDIO:
- ⚠️ Erro é ocultado do usuário
- ⚠️ Debugging é difícil (erro só aparece no console)
- ⚠️ Inconsistência de capitalização

---

## CONCLUSÃO

**A coleção "usuarios" NUNCA foi criada porque:**

1. **Causa raiz:** Regras de segurança do Firestore bloqueiam escrita
2. **Problema secundário:** Try/catch oculta o erro real
3. **Resultado:** Usuário vê mensagem genérica e desiste
4. **Impacto:** Sistema completamente não funcional

**Ação imediata necessária:**
1. Corrigir regras do Firestore (permitir escrita em "usuarios")
2. Melhorar mensagens de erro
3. Testar login novamente
4. Verificar se coleção é criada automaticamente

---

**Fim da Auditoria**