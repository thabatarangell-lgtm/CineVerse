require('dotenv').config();

const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Conexão com o MySQL
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10
});

// Permite receber dados JSON
app.use(express.json());

// Configuração da sessão
app.use(session({
    name: 'cineverse.sid',
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
        maxAge: 1000 * 60 * 60
    }
}));

// Disponibiliza os arquivos HTML, CSS e JS
app.use(express.static(path.join(__dirname, 'public')));


// CADASTRO
app.post('/api/cadastro', async (req, res) => {
    try {
        const { nome, email, senha } = req.body;

        if (
            typeof nome !== 'string' ||
            typeof email !== 'string' ||
            typeof senha !== 'string' ||
            !nome.trim() ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
            senha.length < 6 ||
            Buffer.byteLength(senha, 'utf8') > 72
        ) {
            return res.status(400).json({
                mensagem: 'Confira o nome, o e-mail e a senha.'
            });
        }

        // Transforma a senha em hash antes de salvar
        const senhaHash = await bcrypt.hash(senha, 12);

        await db.execute(
            `INSERT INTO usuarios (nome, email, senha)
             VALUES (?, ?, ?)`,
            [nome.trim(), email.trim().toLowerCase(), senhaHash]
        );

        res.status(201).json({
            mensagem: 'Cadastro realizado com sucesso!'
        });

    } catch (erro) {
        if (erro.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                mensagem: 'Este e-mail já está cadastrado.'
            });
        }

        console.error('Erro no cadastro:', erro.message);

        res.status(500).json({
            mensagem: 'Não foi possível realizar o cadastro.'
        });
    }
});


// LOGIN
app.post('/api/login', async (req, res) => {
    try {
        const { email, senha } = req.body;

        if (
            typeof email !== 'string' ||
            typeof senha !== 'string' ||
            !email.trim() ||
            !senha
        ) {
            return res.status(400).json({
                mensagem: 'Informe o e-mail e a senha.'
            });
        }

        const [usuarios] = await db.execute(
            `SELECT id, nome, email, senha
             FROM usuarios
             WHERE email = ?
             LIMIT 1`,
            [email.trim().toLowerCase()]
        );

        if (usuarios.length === 0) {
            return res.status(401).json({
                mensagem: 'E-mail ou senha incorretos.'
            });
        }

        const usuario = usuarios[0];

        // Compara a senha digitada com o hash salvo
        const senhaCorreta = await bcrypt.compare(
            senha,
            usuario.senha
        );

        if (!senhaCorreta) {
            return res.status(401).json({
                mensagem: 'E-mail ou senha incorretos.'
            });
        }

        // Cria uma nova sessão após autenticar
        req.session.regenerate((erro) => {
            if (erro) {
                return res.status(500).json({
                    mensagem: 'Não foi possível iniciar a sessão.'
                });
            }

            req.session.usuario = {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email
            };

            req.session.save((erroSalvar) => {
                if (erroSalvar) {
                    return res.status(500).json({
                        mensagem: 'Não foi possível salvar a sessão.'
                    });
                }

                res.json({
                    mensagem: 'Login realizado com sucesso!',
                    usuario: req.session.usuario
                });
            });
        });

    } catch (erro) {
        console.error('Erro no login:', erro.message);

        res.status(500).json({
            mensagem: 'Não foi possível realizar o login.'
        });
    }
});


// CONSULTAR USUÁRIO CONECTADO
app.get('/api/me', (req, res) => {
    if (!req.session.usuario) {
        return res.status(401).json({
            mensagem: 'Você não está conectado.'
        });
    }

    res.json({
        usuario: req.session.usuario
    });
});


// ENCERRAR SESSÃO
app.post('/api/logout', (req, res) => {
    req.session.destroy((erro) => {
        if (erro) {
            return res.status(500).json({
                mensagem: 'Não foi possível sair da conta.'
            });
        }

        res.clearCookie('cineverse.sid');

        res.json({
            mensagem: 'Você saiu da sua conta.'
        });
    });
});


// Inicia o servidor depois de testar a conexão com o MySQL
async function iniciarServidor() {
    try {
        const conexao = await db.getConnection();
        await conexao.ping();
        conexao.release();

        app.listen(PORT, () => {
            console.log(`CineVerse rodando em http://localhost:${PORT}`);
        });
    } catch (erro) {
        console.error(
            'Não foi possível conectar ao MySQL:',
            erro.message
        );

        process.exit(1);
    }
}

iniciarServidor();