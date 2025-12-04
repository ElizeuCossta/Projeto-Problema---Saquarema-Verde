document.addEventListener('DOMContentLoaded', () => {
    const PORT = 8080;
    const adminToken = localStorage.getItem('adminToken');
    
    // Elementos da Seção de Cadastro/Edição
    const cadastroForm = document.getElementById('cadastroForm'); 
    const mensagemFeedback = document.getElementById('mensagem-cadastro');
    const formTitle = document.getElementById('formTitle');
    const listaEventosAdmin = document.getElementById('lista-eventos-admin');
    
    let eventoEmEdicaoId = null; 

    // --- FUNÇÃO DE AJUDA: FORMATAÇÃO DE DATA ---
    const formatarData = (dataStr) => {
        if (!dataStr) return 'Não definida';
        // Pega a parte da data (YYYY-MM-DD)
        const datePart = dataStr.substring(0, 10); 
        // Converte para DD/MM/YYYY
        const parts = datePart.split('-'); 
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return datePart; 
    }
    // -------------------------------------------

    // 1. VERIFICAÇÃO DE AUTENTICAÇÃO INICIAL
    if (!adminToken) {
        alert('Sua sessão expirou ou você não está logado. Redirecionando...');
        window.location.href = `http://localhost:${PORT}/login.html`;
        return;
    }

    // 2. LÓGICA DE LOGOUT
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('adminToken');
            window.location.href = `http://localhost:${PORT}/login.html`;
        });
    }

    // 3. FUNÇÃO PARA CARREGAR LISTA (EXIBE DATA/HORA)
    async function carregarEventosAdmin() {
        if (!listaEventosAdmin) return;
        listaEventosAdmin.innerHTML = '<p>Carregando itens para administração...</p>';

        try {
            const response = await fetch(`http://localhost:${PORT}/api/eventos`); 
            if (!response.ok) {
                throw new Error('Falha ao buscar itens da lista.');
            }

            const eventos = await response.json();
            listaEventosAdmin.innerHTML = '';

            if (eventos.length === 0) {
                listaEventosAdmin.innerHTML = '<p>Nenhum item cadastrado.</p>';
                return;
            }

            eventos.forEach(evento => {
                const eventoDiv = document.createElement('div');
                eventoDiv.classList.add('card-atracao-admin'); 
                eventoDiv.innerHTML = `
                    <div class="card-content">
                        <h4>ID ${evento.id}: ${evento.nome} (${evento.tipo})</h4>
                        <p>
                            📅 **Data:** ${formatarData(evento.data_evento)} 
                            🕒 **Hora:** ${evento.hora_evento || 'Não definida'}
                        </p>
                        <p>${evento.descricao.substring(0, 100)}...</p>
                    </div>
                    <div class="card-actions">
                        <button class="btn-editar" data-id="${evento.id}">Editar</button>
                        <button class="btn-excluir" data-id="${evento.id}">Excluir</button>
                    </div>
                `;
                listaEventosAdmin.appendChild(eventoDiv);
            });
            
            // Adiciona listeners aos botões
            document.querySelectorAll('.btn-excluir').forEach(button => {
                button.addEventListener('click', (e) => {
                    const id = e.target.dataset.id;
                    if (confirm(`Tem certeza que deseja excluir o item ID ${id}?`)) {
                        excluirEvento(id);
                    }
                });
            });

            document.querySelectorAll('.btn-editar').forEach(button => {
                button.addEventListener('click', (e) => {
                    abrirFormularioEdicao(e.target.dataset.id);
                });
            });

        } catch (error) {
            console.error('Erro ao carregar lista de admin:', error);
            listaEventosAdmin.innerHTML = `<p style="color: red;">Erro: ${error.message}</p>`;
        }
    }


    // 4. FUNÇÃO PARA PREENCHER O FORMULÁRIO COM DADOS DO ITEM (Inclui data/hora)
    async function abrirFormularioEdicao(id) {
        try {
            const response = await fetch(`http://localhost:${PORT}/api/eventos/${id}`); 
            if (!response.ok) {
                throw new Error('Item não encontrado.');
            }
            const evento = await response.json();

            // Preenche o formulário
            document.getElementById('nome').value = evento.nome;
            document.getElementById('descricao').value = evento.descricao;
            document.getElementById('tipo').value = evento.tipo;
            // NOVO: Preenche data e hora
            document.getElementById('data_evento').value = evento.data_evento ? evento.data_evento.substring(0, 10) : ''; 
            document.getElementById('hora_evento').value = evento.hora_evento || '';


            // Define o modo de edição
            eventoEmEdicaoId = id; 
            formTitle.textContent = `✏️ Editando Item ID ${id}`;
            document.querySelector('.btn-submit').textContent = 'Salvar Alterações';
            mensagemFeedback.textContent = 'Modo de Edição. Preencha e salve.';
            mensagemFeedback.style.color = '#FFA000'; 
            mensagemFeedback.style.backgroundColor = '#FFF8E1'; 

            window.scrollTo({ top: 0, behavior: 'smooth' });

        } catch (error) {
            alert(`Falha ao buscar dados para edição: ${error.message}`);
            console.error(error);
        }
    }
    
    // 5. FUNÇÃO PARA LIMPAR O FORMULÁRIO
    function resetFormulario() {
        cadastroForm.reset();
        eventoEmEdicaoId = null; 
        formTitle.textContent = '➕ Inserir Novo Item';
        document.querySelector('.btn-submit').textContent = 'Cadastrar Item';
        mensagemFeedback.textContent = '';
        mensagemFeedback.style.color = '';
        mensagemFeedback.style.backgroundColor = '';
    }

    // 6. FUNÇÃO UNIFICADA DE CADASTRO/EDIÇÃO (Inclui data/hora)
    if (cadastroForm) {
        cadastroForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            mensagemFeedback.textContent = 'Aguarde...'; 
            mensagemFeedback.style.color = '#00796B';

            const nome = document.getElementById('nome').value;
            const descricao = document.getElementById('descricao').value;
            const tipo = document.getElementById('tipo').value;
            // NOVO: Coleta data e hora
            const data_evento = document.getElementById('data_evento').value;
            const hora_evento = document.getElementById('hora_evento').value;

            // NOVO: Inclui data e hora no objeto de dados
            const dados = { nome, descricao, tipo, data_evento, hora_evento }; 

            let url = `http://localhost:${PORT}/api/eventos`; 
            let method = 'POST';

            if (eventoEmEdicaoId) {
                url = `http://localhost:${PORT}/api/eventos/${eventoEmEdicaoId}`; 
                method = 'PUT';
            }

            try {
                const response = await fetch(url, {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${adminToken}`
                    },
                    body: JSON.stringify(dados)
                });

                const data = await response.json();

                if (response.ok) {
                    mensagemFeedback.textContent = `✅ Sucesso: ${data.message}`;
                    mensagemFeedback.style.color = '#004D40';
                    mensagemFeedback.style.backgroundColor = '#E8F5E9';
                    
                    if (method === 'PUT') {
                        const btn = document.createElement('button');
                        btn.textContent = 'Voltar para Novo Cadastro';
                        btn.classList.add('btn-submit');
                        btn.style.width = 'auto'; 
                        btn.addEventListener('click', resetFormulario);
                        mensagemFeedback.appendChild(btn);
                        
                    } else {
                        cadastroForm.reset();
                    }
                    
                    carregarEventosAdmin(); 
                } else {
                    mensagemFeedback.textContent = `❌ Falha: ${data.message || data.error || 'Erro desconhecido.'}`;
                    mensagemFeedback.style.color = '#D32F2F';
                    mensagemFeedback.style.backgroundColor = '#FFEBEE';
                }

            } catch (error) {
                console.error('Erro de rede:', error);
                mensagemFeedback.textContent = '🚨 Erro de conexão com o servidor.';
                mensagemFeedback.style.color = '#D32F2F';
                mensagemFeedback.style.backgroundColor = '#FFEBEE';
            }
        });
    }

    // 7. FUNÇÃO PARA EXCLUIR ITEM
    async function excluirEvento(id) {
        try {
            const response = await fetch(`http://localhost:${PORT}/api/eventos/${id}`, { 
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${adminToken}`
                }
            });

            if (response.status === 204) {
                alert('Item excluído com sucesso!');
                carregarEventosAdmin();
            } else if (response.status === 401 || response.status === 403) {
                alert('Sua sessão expirou. Faça login novamente.');
                localStorage.removeItem('adminToken');
                window.location.href = `http://localhost:${PORT}/login.html`;
            } else {
                const data = await response.json();
                alert(`Falha ao excluir: ${data.message || 'Erro desconhecido.'}`);
            }

        } catch (error) {
            alert('Erro de conexão ao tentar excluir.');
            console.error(error);
        }
    }

    carregarEventosAdmin();
});