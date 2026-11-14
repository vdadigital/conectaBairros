# ConectaBairros para a apresentação da faculdade

O Balcão de serviços é um mural de anúncios de mão de obra. Entre com Google, escolha **Profissional de mão de obra** e informe nome público, profissão, serviços oferecidos, cidade, UF e WhatsApp. Bairro e foto são opcionais. A profissão aceita sugestões como pedreiro, eletricista e carpinteiro e também texto livre. Use **Negócios locais** no seletor de anúncios para acessar os cadastros anteriores. Para mover um anúncio existente ao balcão, edite-o, selecione o tipo profissional e preencha profissão e cidade.

Em **Pergunte à IA**, escreva uma pergunta sobre os serviços cadastrados. O navegador seleciona até 12 anúncios de profissionais do catálogo público e o servidor pede ao Gemini uma resposta com até três anúncios relacionados. Perguntas sem correspondência podem receber uma resposta sem sugestões. O resultado depende dos anúncios cadastrados e da seleção inicial por termos.

## Rodar localmente

1. Extraia o ZIP e abra o PowerShell na pasta que contém `index.php`.
2. Use PHP 8.1 ou superior com `openssl` e `allow_url_fopen` habilitados. Para habilitar a IA, configure `GEMINI_API_KEY` no ambiente do processo PHP com uma chave do [Google AI Studio](https://aistudio.google.com/app/apikey). O modelo padrão é `gemini-3.5-flash`. Use `GEMINI_MODEL` se precisar selecionar outro modelo que aceite saída JSON estruturada. [Referência da API Gemini](https://ai.google.dev/api/generate-content)
3. Rode `php -S localhost:8080` e acesse [o projeto local](http://localhost:8080). O catálogo e o login precisam de acesso à internet. Para usar login Google localmente, confira se `localhost` está autorizado no Firebase Authentication.
4. Depois de aplicar as regras abaixo no ambiente de teste, publique um anúncio de eletricista e procure pelo serviço na cidade informada. Confira os detalhes, o WhatsApp e o filtro **Somente meus anúncios**. Se a IA estiver configurada, pergunte onde encontrar um eletricista nessa cidade.

## Integrar à hospedagem existente

Atualize index.php, negocio.php, os três scripts em assets/js usados por essas páginas e api/pesquisa-ia.php. Configure a chave Gemini como variável de ambiente no PHP.

No Firebase Console, abra **Firestore Database → Regras**. Aplique às regras vigentes as alterações de firestore.rules que adicionam o campo profissao às listas de criação e edição de comerciantes e a validação profissionalValido às duas operações. Preserve as permissões vigentes, inclusive eventuais permissões administrativas. O cadastro de profissionais depende dessas alterações nas regras do Firebase, mesmo ao rodar a página localmente.

O ZIP contém a cópia de trabalho completa. Ela usa a configuração Firebase já presente no projeto, portanto operações de cadastro ou edição podem atingir o catálogo real. Para uma apresentação isolada, aponte o projeto para um Firebase de teste.
