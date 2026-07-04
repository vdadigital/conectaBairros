# AUDITORIA DE EXECUÇÃO - função fazerLoginGoogle()

## Código Analisado
**Arquivo:** `assets/js/conectabairros.js`  
**Função:** `fazerLoginGoogle()` (linhas 48-110)  
**Listener:** `auth.onAuthStateChanged()` (linhas 131-171)

---

## FLUXO PASSO A PASSO

### 1. auth.signInWithPopup() é executado?

**SIM** - Linha 64:
```javascript
const result = await auth.signInWithPopup(provider);
```

**Fluxo:**
- Abre popup do Google
- Usuário faz login
- Retorna `result` com `result.user` contendo dados do usuário autenticado
- **NÃO há return, throw ou qualquer interrupção antes desta linha**

---

### 2. O usuário é retornado corretamente?

**SIM** - Linha 65:
```javascript
const usuario = result.user;
```

**Fluxo:**
- `result.user` contém: `uid`, `email`, `displayName`, `photoURL`
- **NÃO há return, throw ou qualquer interrupção antes desta linha**

---

### 3. A linha `const docRef = db.collection("usuarios").doc(usuario.uid)` é executada?

**SIM** - Linha 68:
```javascript
const docRef = db.collection("usuarios").doc(usuario.uid);
```

**Fluxo:**
- Cria referência para documento na coleção "usuarios"
- **NÃO há return, throw ou qualquer interrupção antes desta linha**

---

### 4. O doc.get() retorna o quê?

**Linha 69:**
```javascript
const doc = await docRef.get();
```

**Retorno:**
- Retorna um `DocumentSnapshot` do Firestore
- **Se o documento NÃO existe:** `doc.exists === false`, `doc.data()` é `undefined`
- **Se o documento EXISTE:** `doc.exists === true`, `doc.data()` contém os dados
- **NÃO há return, throw ou qualquer interrupção antes desta linha**

---

### 5. O if (!doc.exists) entra ou não entra?

**DEPENDE DO ESTADO DO FIRESTORE:**

**Cenário A - Primeiro login (documento NÃO existe):**
- `doc.exists === false`
- **ENTRA** no bloco `if (!doc.exists)` (linha 71)
- Executa linhas 73-85
- Cria documento com `docRef.set()`

**Cenário B - Login subsequente (documento EXISTE):**
- `doc.exists === true`
- **NÃO ENTRA** no bloco `if (!doc.exists)`
- Vai direto para linha 86 (else)
- **NÃO executa `docRef.set()`**

---

### 6. O await docRef.set(...) é realmente executado?

**APENAS SE `!doc.exists` for true (primeiro login)**

**Linha 75:**
```javascript
await docRef.set({
    uid: usuario.uid,
    nome: usuario.displayName,
    email: usuario.email,
    foto: usuario.photoURL || "",
    tipo: ehAdmin ? "admin" : "empreendedor",
    ativo: true,
    criadoEm: firebase.firestore.FieldValue.serverTimestamp()
});
```

**Condições para execução:**
1. `auth.signInWithPopup()` deve ter sucesso
2. `docRef.get()` deve retornar `doc.exists === false`
3. **NÃO deve haver erro no `set()`**

**Se `doc.exists === true` (login subsequente):**
- **NÃO executa `docRef.set()`**
- Vai direto para linha 86

---

### 7. Existe algum return antes do set()?

**NÃO** - Dentro da função `fazerLoginGoogle()`:

**Linhas 48-110:**
- Linha 64: `await auth.signInWithPopup(provider)` - **sem return**
- Linha 65: `const usuario = result.user` - **sem return**
- Linha 68: `const docRef = ...` - **sem return**
- Linha 69: `const doc = await docRef.get()` - **sem return**
- Linha 71: `if (!doc.exists)` - **sem return**
- Linha 75: `await docRef.set(...)` - **é o set() em si**

**Únicos returns na função:**
- Linha 109: Fim da função (após catch)
- **Nenhum return antes do set()**

---

### 8. Existe algum throw antes do set()?

**NÃO** - Dentro da função `fazerLoginGoogle()`:

**Linhas 48-110:**
- Não há nenhum `throw` explícito
- Não há nenhuma condição que lance erro antes do `set()`

**Único try-catch:**
- Linha 51: `try { ... }` (linhas 51-109)
- Linha 97: `catch (error) { ... }`
- **Nenhum throw dentro do try antes do set()**

---

### 9. Existe algum await que nunca termina?

**NÃO** - Todos os awaits são operações assíncronas normais:

**Lista de awaits:**
1. Linha 64: `await auth.signInWithPopup(provider)` - **Termina quando usuário faz login**
2. Linha 69: `await docRef.get()` - **Termina quando Firestore responde**
3. Linha 75: `await docRef.set(...)` - **Termina quando documento é criado**
4. Linha 91: `await docRef.get()` - **Termina quando Firestore responde**

**Nenhum await infinito ou sem resolução**

---

### 10. Existe alguma chamada do onAuthStateChanged que substitui usuarioAtual antes do set()?

**SIM - PROBLEMA CRÍTICO IDENTIFICADO**

**Linhas 131-171:**
```javascript
auth.onAuthStateChanged(async (usuario) => {
    if (usuario) {
        try {
            const docRef = db.collection("usuarios").doc(usuario.uid);
            const doc = await docRef.get();
            
            if (doc.exists) {
                usuarioAtual = doc.data();  // <-- ATUALIZA usuarioAtual
            }
        } catch (error) {
            console.error("Erro ao carregar dados do usuário:", error);
        }
    }
});
```

**Problema de Race Condition:**

**Cenário - Primeiro login:**
1. Linha 64: `auth.signInWithPopup()` é executado
2. **IMEDIATAMENTE** o Firebase dispara `onAuthStateChanged()`
3. `onAuthStateChanged` executa linha 137-138: `docRef.get()`
4. **NESTE MOMENTO** o documento AINDA NÃO EXISTE (set() não executou ainda)
5. `doc.exists === false`
6. **Linha 140: `if (doc.exists)` é FALSE**
7. **`usuarioAtual` NÃO é atualizado** (permanece `null`)
8. **Volta para fazerLoginGoogle()**
9. Linha 69: `docRef.get()` retorna `doc.exists === false`
10. Linha 71: Entra no `if (!doc.exists)`
11. Linha 75: Executa `docRef.set()` - **cria o documento**
12. Linha 91: `docRef.get()` retorna `doc.exists === true`
13. Linha 92: `usuarioAtual = docAtualizado.data()` - **atualiza usuarioAtual**

**Resultado:** O documento É criado, mas `usuarioAtual` pode ficar `null` temporariamente se o `onAuthStateChanged` executar antes do `set()`.

---

## RESUMO DO FLUXO COMPLETO

### Fluxo Normal (Primeiro Login):

```
1. [48] window.fazerLoginGoogle = async function() {
2. [49] const btnLogin = document.querySelector(...)
3. [53-62] Mostra loading no botão
4. [64] await auth.signInWithPopup(provider)
   └─> Popup do Google abre
   └─> Usuário faz login
   └─> Retorna result com result.user
   
   ┌─> [131] auth.onAuthStateChanged é disparado (ASSÍNCRONO)
   │   [137] const docRef = db.collection("usuarios").doc(usuario.uid)
   │   [138] const doc = await docRef.get()
   │   └─> NESTE MOMENTO: documento NÃO EXISTE
   │   [140] if (doc.exists) → FALSE
   │   └─> usuarioAtual NÃO é atualizado (permanece null)
   │   [145] catch não é executado
   │   [156] else não é executado (usuario é truthy)
   │   [171] Fim do onAuthStateChanged
   └─> Fim do disparo assíncrono
   
5. [65] const usuario = result.user
6. [68] const docRef = db.collection("usuarios").doc(usuario.uid)
7. [69] const doc = await docRef.get()
   └─> Retorna DocumentSnapshot com exists === false
8. [71] if (!doc.exists) → TRUE (primeiro login)
9. [73] const ehAdmin = ADMIN_EMAILS.includes(usuario.email)
10. [75] await docRef.set({...})
    └─> CRIA O DOCUMENTO NA COLEÇÃO "usuarios"
    └─> Aguarda confirmação do Firestore
11. [85] console.log("Usuário criado...")
12. [86] else não é executado
13. [91] const docAtualizado = await docRef.get()
    └─> Retorna DocumentSnapshot com exists === true
14. [92] usuarioAtual = docAtualizado.data()
    └─> usuarioAtual agora tem os dados do usuário
15. [94] console.log("Login realizado...")
16. [95] mostrarSucesso(`Bem-vindo, ${usuario.displayName}!`)
17. [97-109] catch não é executado (sem erro)
18. [110] Fim da função
```

### Fluxo se doc.exists === true (Login Subsequente):

```
1-7. Mesmo fluxo até linha 69
8. [71] if (!doc.exists) → FALSE (documento já existe)
9. [86] else é executado
10. [87] console.log("Usuário já existe...")
11. [91] const docAtualizado = await docRef.get()
12. [92] usuarioAtual = docAtualizado.data()
13-18. Mesmo fluxo final
```

---

## CONCLUSÃO

### Por que a coleção "usuarios" NUNCA é criada?

**O código ESTÁ correto para criar a coleção.** A linha 75 `await docRef.set()` **DEVE executar** se `doc.exists === false`.

**Possíveis razões REais para a coleção não ser criada:**

1. **Erro no signInWithPopup()** (linha 64)
   - Se o login falhar, vai para catch (linha 97)
   - **NÃO executa o set()**

2. **Erro no docRef.get()** (linha 69)
   - Se houver erro de permissão ou rede
   - Vai para catch (linha 97)
   - **NÃO executa o set()**

3. **doc.exists === true** (linha 71)
   - Se o documento JÁ EXISTE
   - **NÃO executa o set()** (vai para else linha 86)

4. **Erro no docRef.set()** (linha 75)
   - Se houver erro de permissão ou regra do Firestore
   - Vai para catch (linha 97)
   - **Documento NÃO é criado**

5. **Race condition com onAuthStateChanged** (linhas 131-171)
   - **NÃO impede a criação do documento**
   - Apenas afeta `usuarioAtual` temporariamente

---

## FLUXO REAL DO CÓDIGO (SEM SUPOSIÇÕES)

### Execução Síncrona (linha por linha):

```
[64] await auth.signInWithPopup(provider)
     └─> AGUARDA popup do Google
     
[65] const usuario = result.user
     └─> Atribui usuário retornado
     
[68] const docRef = db.collection("usuarios").doc(usuario.uid)
     └─> Cria referência
     
[69] const doc = await docRef.get()
     └─> AGUARDA resposta do Firestore
     └─> Retorna: DocumentSnapshot { exists: boolean, data: function }
     
[71] if (!doc.exists)
     └─> AVALIA: doc.exists é true ou false?
     
[SE doc.exists === false:]
    [73] const ehAdmin = ADMIN_EMAILS.includes(usuario.email)
    [75] await docRef.set({...})
         └─> AGUARDA criação no Firestore
         └─> CRIA documento se não houver erro
    [85] console.log(...)
    [86] else NÃO executa
    
[SE doc.exists === true:]
    [71] if NÃO entra
    [86] else executa
    [87] console.log(...)
    [75] set() NÃO executa

[91] const docAtualizado = await docRef.get()
     └─> AGUARDA resposta do Firestore
     
[92] usuarioAtual = docAtualizado.data()
     └─> Atribui dados do usuário
     
[94-95] console.log e mostrarSucesso
[97-109] catch NÃO executa (sem erro)
[110] Fim da função
```

---

## PONTOS CRÍTICOS IDENTIFICADOS

### 1. **onAuthStateChanged pode executar ANTES do set()**
- **Linha 131-171:** Listener é disparado quando `signInWithPopup()` completa
- **Linha 137-142:** Faz `docRef.get()` e verifica `doc.exists`
- **Problema:** Se executar antes do `set()` (linha 75), `doc.exists === false`
- **Resultado:** `usuarioAtual` não é atualizado no listener
- **Solução:** O `set()` na linha 75 ainda executa, então o documento é criado

### 2. **Não há validação de erro no set()**
- Se `docRef.set()` falhar (permissão, regras, rede)
- Vai para catch (linha 97)
- **Documento NÃO é criado**

### 3. **Não há verificação se usuarioAtual foi atualizado**
- Após linha 92, não há verificação se `usuarioAtual` é válido
- Se `onAuthStateChanged` executou antes do `set()`, `usuarioAtual` pode estar desatualizado

---

## COMANDOS PARA DEBUG

Para verificar o que realmente acontece, adicione logs:

```javascript
// Linha 64 - antes do signInWithPopup
console.log("[1] Iniciando signInWithPopup...");

// Linha 69 - após doc.get()
console.log("[2] doc.exists:", doc.exists, "| doc.data():", doc.data());

// Linha 71 - antes do if
console.log("[3] Avaliando if (!doc.exists):", !doc.exists);

// Linha 75 - antes do set()
console.log("[4] Executando docRef.set()...");

// Linha 92 - após atualizar usuarioAtual
console.log("[5] usuarioAtual atualizado:", usuarioAtual);

// Linha 131 - no onAuthStateChanged
console.log("[ON_AUTH] Disparado para uid:", usuario.uid);
console.log("[ON_AUTH] doc.exists:", doc.exists);
console.log("[ON_AUTH] usuarioAtual definido:", !!doc.exists);
```

---

## VEREDITO FINAL

**O código para criar a coleção "usuarios" ESTÁ presente e correto.**

**A coleção NÃO será criada APENAS se:**
1. `signInWithPopup()` falhar (erro de autenticação)
2. `docRef.get()` falhar (erro de rede/permissão)
3. `doc.exists === true` (documento já existe)
4. `docRef.set()` falhar (erro de permissão/regras do Firestore)

**NÃO há:**
- ❌ Return antes do set()
- ❌ Throw antes do set()
- ❌ Await infinito
- ❌ Código que impede a execução do set()

**Há:**
- ⚠️ Race condition com `onAuthStateChanged` (afeta apenas `usuarioAtual`, não a criação do documento)
- ⚠️ Sem validação de erro no `set()`
- ⚠️ Sem verificação se `usuarioAtual` foi atualizado corretamente