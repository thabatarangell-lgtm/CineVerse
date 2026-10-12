// CADASTRO E LOGIN
document.querySelectorAll('[data-demo-form]').forEach((form) => {
    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const message = form.querySelector('.form-message');
        const botao = form.querySelector('button[type="submit"]');

        const dados = Object.fromEntries(
            new FormData(form).entries()
        );

        const isCadastro = form.querySelector('#nome') !== null;

        const rota = isCadastro
            ? '/api/cadastro'
            : '/api/login';

        message.textContent = 'Aguarde...';
        botao.disabled = true;

        try {
            const resposta = await fetch(rota, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dados)
            });

            const resultado = await resposta.json();

            if (!resposta.ok) {
                throw new Error(resultado.mensagem);
            }

            message.textContent = resultado.mensagem;

            if (isCadastro) {
                // Cadastro concluído: encaminha para o login
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1000);
            } else {
                // Login concluído: volta para a página inicial
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);
            }

        } catch (erro) {
            message.textContent =
                erro.message || 'Erro ao conectar com o servidor.';
        } finally {
            botao.disabled = false;
        }
    });
});


// MOSTRAR OU OCULTAR SENHA
document.querySelectorAll('.show-password').forEach((button) => {
    button.addEventListener('click', () => {
        const input = button.parentElement.querySelector('input');

        const mostrar = input.type === 'password';

        input.type = mostrar ? 'text' : 'password';

        button.textContent = mostrar ? '◎' : '◉';

        button.setAttribute(
            'aria-label',
            mostrar ? 'Ocultar senha' : 'Mostrar senha'
        );
    });
});


// RECUPERAÇÃO DE SENHA
document.querySelectorAll('[data-forgot]').forEach((link) => {
    link.addEventListener('click', (event) => {
        event.preventDefault();

        const message = document.querySelector('.form-message');

        if (message) {
            message.textContent =
                'A recuperação de senha ainda não foi implementada.';
        }
    });
});