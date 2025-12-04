// Importando bibliotecas necessárias
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs'); 

const app = express();

// --- Variáveis de Configuração ---
const SECRET_KEY = 'sua_chave_secreta_muito_segura'; 
const PORT = process.env.PORT || 8080;
// ---------------------------------

// Configuração da conexão ao banco de dados
const db = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root', // substitua pelo seu usuário
    password: '', // substitua pela sua senha
    database: 'saquarema_verde' 
});

// Conectando ao banco de dados
db.connect(err => {
    if (err) {
        console.error('🛑 ERRO GRAVE: Falha ao conectar ao banco de dados:', err);
        process.exit(1); 
    } else {
        console.log('✅ Conectado ao banco de dados MySQL!');
    }
});

// Aplicando middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve arquivos estáticos da pasta 'public'
app.use(express.static('public')); 

// ----------------------------------------------------
// --- FUNÇÃO PARA VERIFICAR AUTENTICAÇÃO (MIDDLEWARE) ---
// ----------------------------------------------------
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(403).json({ message: 'Acesso negado: Token não fornecido.' });
    }
    const token = authHeader.split(' ')[1]; 
    if (!token) {
        return res.status(403).json({ message: 'Acesso negado: Formato de token inválido.' });
    }

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: 'Token inválido ou expirado.' });
        }
        req.usuario = decoded.usuario; 
        next(); 
    });
};

// ----------------------------------------------------
// --- ENDPOINTS PÚBLICOS ---
// ----------------------------------------------------

// Endpoint 1: Listar todos os itens (público)
app.get('/api/eventos', (req, res) => {
    // Assumimos que a tabela foi renomeada para 'eventos' (ou 'itens') no banco
    db.query('SELECT * FROM eventos', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Endpoint 2: Buscar item por ID 
app.get('/api/eventos/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'SELECT * FROM eventos WHERE id = ?';
    db.query(sql, [id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) {
            return res.status(404).json({ message: 'Item não encontrado.' });
        }
        res.json(results[0]);
    });
});

// Endpoint 3: Autenticação de administradores (LOGIN)
app.post('/api/login', (req, res) => {
    const { usuario, senha } = req.body;

    const sql = 'SELECT * FROM administradores WHERE usuario = ?';
    db.query(sql, [usuario], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (results.length === 0) {
            return res.status(401).json({ message: 'Usuário ou senha incorretos' });
        }

        const admin = results[0];
        
        const senhaCorreta = bcrypt.compareSync(senha, admin.senha);
        
        if (!senhaCorreta) {
            return res.status(401).json({ message: 'Usuário ou senha incorretos' });
        }
        
        const token = jwt.sign({ usuario: admin.usuario }, SECRET_KEY, { expiresIn: '1h' }); 
        
        res.json({ token, message: 'Login realizado com sucesso!' });
    });
});

// ----------------------------------------------------
// --- ENDPOINTS PROTEGIDOS (ADMIN) ---
// ----------------------------------------------------

// Endpoint 4: Inserir um novo item (PROTEGIDO - POST)
app.post('/api/eventos', verifyToken, (req, res) => {
    // Campos novos: data_evento e hora_evento
    const { nome, descricao, tipo, data_evento, hora_evento } = req.body;
    
    // SQL atualizada com os novos campos
    const sql = 'INSERT INTO eventos (nome, descricao, tipo, data_evento, hora_evento) VALUES (?, ?, ?, ?, ?)'; 
    db.query(sql, [nome, descricao, tipo, data_evento, hora_evento], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id: result.insertId, nome, descricao, tipo, data_evento, hora_evento, message: 'Item cadastrado!' });
    });
});

// Endpoint 5: Atualizar um item existente (PROTEGIDO - PUT)
app.put('/api/eventos/:id', verifyToken, (req, res) => {
    const { id } = req.params;
    // Campos novos: data_evento e hora_evento
    const { nome, descricao, tipo, data_evento, hora_evento } = req.body;

    // SQL atualizada com os novos campos
    const sql = 'UPDATE eventos SET nome = ?, descricao = ?, tipo = ?, data_evento = ?, hora_evento = ? WHERE id = ?';
    db.query(sql, [nome, descricao, tipo, data_evento, hora_evento, id], (err, result) => {
        if (err) {
            console.error('Erro ao atualizar item:', err);
            return res.status(500).json({ message: 'Falha ao atualizar o item no banco de dados.' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Item não encontrado.' });
        }
        res.status(200).json({ message: 'Item atualizado com sucesso!', id: id });
    });
});

// Endpoint 6: Excluir um item (PROTEGIDO - DELETE)
app.delete('/api/eventos/:id', verifyToken, (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM eventos WHERE id = ?';
    db.query(sql, [id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Item não encontrado.' });
        }
        res.status(204).send(); 
    });
});

// ----------------------------------------------------
// --- INICIANDO O SERVIDOR ---
// ----------------------------------------------------
app.listen(PORT, () => {
    console.log(`\nServidor Express rodando na porta ${PORT}`);
    console.log(`Acesse: http://localhost:${PORT}/\n`);
});