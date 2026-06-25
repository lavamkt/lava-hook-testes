document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const jsonInput = document.getElementById('jsonInput');
    const lineNumbers = document.getElementById('lineNumbers');
    const validationStatus = document.getElementById('validationStatus');
    const validationMessage = document.getElementById('validationMessage');
    const sendBtn = document.getElementById('sendBtn');
    const btnSpinner = document.getElementById('btnSpinner');
    const templateSelector = document.getElementById('templateSelector');
    const customTemplatesGroup = document.getElementById('customTemplatesGroup');
    const saveTemplateBtn = document.getElementById('saveTemplateBtn');
    const formatBtn = document.getElementById('formatBtn');
    const minifyBtn = document.getElementById('minifyBtn');
    const clearBtn = document.getElementById('clearBtn');
    const responsePlaceholder = document.getElementById('responsePlaceholder');
    const responseCodeDisplay = document.getElementById('responseCodeDisplay');
    const responseCode = document.getElementById('responseCode');
    const responseMeta = document.getElementById('responseMeta');
    const statusBadge = document.getElementById('statusBadge');
    const timeElapsed = document.getElementById('timeElapsed');
    const toggleHistoryBtn = document.getElementById('toggleHistoryBtn');
    const sidebar = document.getElementById('sidebar');
    const historyList = document.getElementById('historyList');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    const webhookUrlInput = document.getElementById('webhookUrlInput');

    // Default Templates
    const defaultTemplates = {
        simple: {
            teste: "sucesso",
            data: new Date().toLocaleDateString('pt-BR'),
            origem: "Lava Hook Testes"
        },
        user: {
            usuario: {
                nome: "Carlos Silva",
                email: "carlos.silva@exemplo.com",
                cargo: "Desenvolvedor",
                ativo: true,
                tags: ["dev", "n8n", "json"]
            }
        },
        lead: {
            evento: "conversao_lead",
            origem_midia: "google_ads",
            lead: {
                id: Math.floor(Math.random() * 10000),
                nome: "Ana Oliveira",
                telefone: "+5511999998888",
                empresa: "Tech Solutions",
                interesse: "Automacao de Processos"
            }
        },
        n8n: {
            action: "trigger_flow",
            payload: {
                workflowId: "testes-adn",
                variables: {
                    ambiente: "producao",
                    versao: "1.0.0"
                },
                items: [
                    { id: 1, status: "pending" },
                    { id: 2, status: "completed" }
                ]
            }
        }
    };

    // Load URL and Custom Templates from Local Storage
    let webhookUrl = localStorage.getItem('lavahook_url') || '';
    webhookUrlInput.value = webhookUrl;

    let requestHistory = JSON.parse(localStorage.getItem('lavahook_history') || '[]');
    let customTemplates = JSON.parse(localStorage.getItem('lavahook_custom_templates') || '{}');

    // Functions
    function updateLineNumbers() {
        const text = jsonInput.value;
        const lines = text.split('\n');
        const count = Math.max(lines.length, 1);
        
        let numbersHtml = '';
        for (let i = 1; i <= count; i++) {
            numbersHtml += `${i}<br>`;
        }
        lineNumbers.innerHTML = numbersHtml;
    }

    // Render custom templates in select dropdown
    function renderCustomTemplates() {
        customTemplatesGroup.innerHTML = '';
        const keys = Object.keys(customTemplates);
        
        if (keys.length === 0) {
            const opt = document.createElement('option');
            opt.disabled = true;
            opt.textContent = 'Nenhum template salvo';
            customTemplatesGroup.appendChild(opt);
            return;
        }

        keys.forEach(key => {
            const opt = document.createElement('option');
            opt.value = `custom_${key}`;
            opt.textContent = key;
            customTemplatesGroup.appendChild(opt);
        });
    }

    // Advanced JSON Validator & Linter
    function validateJSON() {
        const value = jsonInput.value.trim();
        const urlValue = webhookUrlInput.value.trim();

        if (!value) {
            setValidationState('error', 'JSON vazio. Por favor, insira o payload.');
            sendBtn.disabled = true;
            return false;
        }

        let isJsonValid = false;
        try {
            JSON.parse(value);
            isJsonValid = true;
        } catch (e) {
            sendBtn.disabled = true;
            
            // Extract error message & position
            const errorMessage = e.message;
            let friendlyError = 'JSON Inválido: ' + errorMessage;
            
            const positionMatch = errorMessage.match(/position\s+(\d+)/i) || 
                                  errorMessage.match(/coluna\s+(\d+)/i) ||
                                  errorMessage.match(/at\s+(\d+)/i);
            
            if (positionMatch && positionMatch[1]) {
                const pos = parseInt(positionMatch[1], 10);
                const beforeError = value.substring(0, pos);
                const lines = beforeError.split('\n');
                const lineNum = lines.length;
                const colNum = lines[lines.length - 1].length + 1;
                
                let suggestion = '';
                const offendingChar = value.charAt(pos);
                
                if (errorMessage.includes('double-quoted property name')) {
                    suggestion = '. Use aspas duplas ("key") para chaves, não aspas simples ou sem aspas.';
                } else if (errorMessage.includes('Unexpected token') || errorMessage.includes('expected')) {
                    if (offendingChar === "'") {
                        suggestion = '. Troque aspas simples por aspas duplas (").';
                    } else if (value.substring(pos - 5, pos + 5).includes(':') && !value.substring(pos - 5, pos + 5).includes(',')) {
                        suggestion = '. Provavelmente falta uma vírgula antes desta linha.';
                    }
                } else if (errorMessage.includes('end of data') || errorMessage.includes('closing')) {
                    suggestion = '. Verifique se chaves { } ou colchetes [ ] estão fechados corretamente.';
                }
                
                friendlyError = `Erro na Linha ${lineNum}, Coluna ${colNum}: ${errorMessage}${suggestion}`;
            }
            
            setValidationState('error', friendlyError);
            return false;
        }

        if (isJsonValid) {
            if (!urlValue) {
                setValidationState('success', 'JSON válido! Insira uma URL de Webhook válida acima para poder enviar.');
                sendBtn.disabled = true;
                return false;
            } else {
                setValidationState('success', 'JSON válido e Webhook configurado! Pronto para enviar.');
                sendBtn.disabled = false;
                return true;
            }
        }
    }

    function setValidationState(type, message) {
        validationStatus.className = `validation-status-bar ${type}`;
        validationMessage.textContent = message;
    }

    function formatJSON() {
        const value = jsonInput.value.trim();
        if (!value) return;
        try {
            const parsed = JSON.parse(value);
            jsonInput.value = JSON.stringify(parsed, null, 2);
            validateJSON();
            updateLineNumbers();
        } catch (e) {
            validateJSON();
        }
    }

    function minifyJSON() {
        const value = jsonInput.value.trim();
        if (!value) return;
        try {
            const parsed = JSON.parse(value);
            jsonInput.value = JSON.stringify(parsed);
            validateJSON();
            updateLineNumbers();
        } catch (e) {
            validateJSON();
        }
    }

    // Save current JSON as custom template
    function saveAsCustomTemplate() {
        const value = jsonInput.value.trim();
        if (!value) {
            alert('O editor está vazio! Digite um JSON válido antes de salvar.');
            return;
        }

        try {
            const parsed = JSON.parse(value);
            const templateName = prompt('Digite um nome para o seu template personalizado:');
            
            if (templateName === null) return; // Cancelled
            const cleanName = templateName.trim();
            
            if (!cleanName) {
                alert('O nome do template não pode ser vazio!');
                return;
            }

            customTemplates[cleanName] = parsed;
            localStorage.setItem('lavahook_custom_templates', JSON.stringify(customTemplates));
            renderCustomTemplates();
            alert(`Template "${cleanName}" salvo com sucesso!`);
        } catch (e) {
            alert('Não foi possível salvar o template. Por favor, certifique-se de que o JSON seja válido antes de salvar.');
        }
    }

    // Load templates
    function loadTemplate(key) {
        if (defaultTemplates[key]) {
            jsonInput.value = JSON.stringify(defaultTemplates[key], null, 2);
        } else if (key.startsWith('custom_')) {
            const customKey = key.replace('custom_', '');
            if (customTemplates[customKey]) {
                jsonInput.value = JSON.stringify(customTemplates[customKey], null, 2);
            }
        }
        validateJSON();
        updateLineNumbers();
    }

    // History Functions
    function saveToHistory(status, statusText, payload, duration, responseText) {
        const historyItem = {
            id: Date.now(),
            timestamp: new Date().toLocaleTimeString('pt-BR'),
            status: status,
            statusText: statusText,
            payload: payload,
            duration: duration,
            responseText: responseText
        };
        
        requestHistory.unshift(historyItem);
        if (requestHistory.length > 20) requestHistory.pop();
        
        localStorage.setItem('lavahook_history', JSON.stringify(requestHistory));
        renderHistory();
    }

    function renderHistory() {
        if (requestHistory.length === 0) {
            historyList.innerHTML = '<div class="empty-history">Nenhum envio recente</div>';
            return;
        }

        historyList.innerHTML = '';
        requestHistory.forEach(item => {
            const isSuccess = item.status >= 200 && item.status < 300;
            const badgeClass = isSuccess ? 'success' : 'error';
            
            const div = document.createElement('div');
            div.className = 'history-item';
            div.innerHTML = `
                <div class="history-item-header">
                    <span class="history-status-badge ${badgeClass}">${item.status} ${item.statusText || ''}</span>
                    <span class="history-time">${item.timestamp}</span>
                </div>
                <div class="history-payload-preview">${escapeHtml(item.payload)}</div>
            `;
            
            div.addEventListener('click', () => {
                jsonInput.value = item.payload;
                validateJSON();
                updateLineNumbers();
                displayResponse(item.status, item.statusText, item.responseText, item.duration);
            });
            
            historyList.appendChild(div);
        });
    }

    function escapeHtml(unsafe) {
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    }

    function displayResponse(status, statusText, bodyText, duration) {
        responsePlaceholder.style.display = 'none';
        responseCodeDisplay.style.display = 'block';
        responseMeta.style.display = 'flex';
        
        statusBadge.className = 'badge';
        if (status >= 200 && status < 300) {
            statusBadge.classList.add('status-2xx');
        } else if (status >= 400 && status < 500) {
            statusBadge.classList.add('status-4xx');
        } else {
            statusBadge.classList.add('status-5xx');
        }
        
        statusBadge.textContent = `${status} ${statusText}`;
        timeElapsed.textContent = `${duration}ms`;

        try {
            const parsed = JSON.parse(bodyText);
            responseCode.textContent = JSON.stringify(parsed, null, 2);
        } catch (e) {
            responseCode.textContent = bodyText || '(Sem corpo de resposta)';
        }
    }

    // Event Listeners
    webhookUrlInput.addEventListener('input', () => {
        webhookUrl = webhookUrlInput.value.trim();
        localStorage.setItem('lavahook_url', webhookUrl);
        validateJSON();
    });

    jsonInput.addEventListener('input', () => {
        validateJSON();
        updateLineNumbers();
    });

    jsonInput.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = jsonInput.selectionStart;
            const end = jsonInput.selectionEnd;
            const value = jsonInput.value;
            
            jsonInput.value = value.substring(0, start) + "  " + value.substring(end);
            jsonInput.selectionStart = jsonInput.selectionEnd = start + 2;
            validateJSON();
        }
    });

    jsonInput.addEventListener('scroll', () => {
        lineNumbers.scrollTop = jsonInput.scrollTop;
    });

    templateSelector.addEventListener('change', (e) => {
        loadTemplate(e.target.value);
        templateSelector.value = ''; 
    });

    saveTemplateBtn.addEventListener('click', saveAsCustomTemplate);
    formatBtn.addEventListener('click', formatJSON);
    minifyBtn.addEventListener('click', minifyJSON);
    
    clearBtn.addEventListener('click', () => {
        jsonInput.value = '';
        validateJSON();
        updateLineNumbers();
        responsePlaceholder.style.display = 'flex';
        responseCodeDisplay.style.display = 'none';
        responseMeta.style.display = 'none';
    });

    toggleHistoryBtn.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
    });

    clearHistoryBtn.addEventListener('click', () => {
        if (confirm('Deseja realmente limpar todo o histórico?')) {
            requestHistory = [];
            localStorage.removeItem('lavahook_history');
            renderHistory();
        }
    });

    // Webhook Submission
    sendBtn.addEventListener('click', async () => {
        const payloadStr = jsonInput.value.trim();
        const urlStr = webhookUrlInput.value.trim();
        if (!payloadStr || !urlStr) return;

        sendBtn.disabled = true;
        sendBtn.classList.add('loading');
        
        const startTime = performance.now();
        let status = 0;
        let statusText = 'Network Error';
        let responseText = '';

        try {
            const response = await fetch(urlStr, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: payloadStr
            });
            
            status = response.status;
            statusText = response.statusText;
            responseText = await response.text();
        } catch (error) {
            console.error('Fetch error:', error);
            statusText = 'Erro de Conexão (CORS ou Offline)';
            responseText = `Falha ao conectar ao webhook.\n\nDetalhes do Erro:\n${error.message}\n\n==================================================\n⚠️ COMO RESOLVER ERRO DE CORS NO N8N:\n==================================================\nSe o seu webhook n8n estiver recebendo a requisição mas retornando erro na tela, você precisa habilitar o CORS nas configurações do nó do webhook no n8n:\n\n1. Abra o seu workflow no n8n e clique duas vezes no nó do Webhook (o nó de entrada).\n2. Na aba de configurações do nó, role até encontrar a seção 'Options' (Opções) e clique em 'Add Option' (Adicionar Opção).\n3. Selecione a opção 'Response Headers' (Cabeçalhos de Resposta).\n4. Adicione os seguintes cabeçalhos (um de cada vez):\n   - Nome: Access-Control-Allow-Origin   | Valor: *\n   - Nome: Access-Control-Allow-Methods  | Valor: POST, GET, OPTIONS\n   - Nome: Access-Control-Allow-Headers  | Valor: Content-Type, Authorization\n\n*Nota: Se você estiver usando um nó 'Respond to Webhook' separado no final do fluxo, você deve aplicar estes mesmos headers de resposta nas opções dele.`;
            status = 0;
        } finally {
            const duration = Math.round(performance.now() - startTime);
            
            sendBtn.classList.remove('loading');
            sendBtn.disabled = false;
            
            saveToHistory(status, statusText, payloadStr, duration, responseText);
            displayResponse(status, statusText, responseText, duration);
        }
    });

    // Initialization
    updateLineNumbers();
    renderHistory();
    renderCustomTemplates();
    loadTemplate('simple');
});
