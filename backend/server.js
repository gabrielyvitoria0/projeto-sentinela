```javascript
const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();


// ======================================================
// CONFIGURAÇÕES
// ======================================================

app.use(express.json());
app.use(cors());


// Servir os arquivos do frontend
app.use(express.static(path.join(__dirname, "../frontend")));


const DB_FILE = path.join(__dirname, "db.json");


// ======================================================
// BANCO DE DADOS
// ======================================================

function readDB() {

    if (!fs.existsSync(DB_FILE)) {

        return {

            usuarios: [],

            pacientes: [],

            triagens: [],

            consultas: [],

            tv_chamada: null,

            tv_historico: []

        };

    }


    const db = JSON.parse(
        fs.readFileSync(DB_FILE, "utf8")
    );


    // Garante que as estruturas existam
    if (!db.usuarios) db.usuarios = [];

    if (!db.pacientes) db.pacientes = [];

    if (!db.triagens) db.triagens = [];

    if (!db.consultas) db.consultas = [];

    if (!db.tv_chamada) db.tv_chamada = null;

    if (!db.tv_historico) db.tv_historico = [];


    return db;

}


function writeDB(data) {

    fs.writeFileSync(
        DB_FILE,
        JSON.stringify(data, null, 2)
    );

}


// ======================================================
// LOGIN
// ======================================================

app.post("/login", (req, res) => {

    const db = readDB();


    const user = db.usuarios.find(u =>

        u.usuario === req.body.usuario &&

        u.senha === req.body.senha

    );


    if (!user) {

        return res.status(401).json({

            erro: "Login inválido"

        });

    }


    res.json(user);

});


// ======================================================
// ATENDIMENTO
// CADASTRA O PACIENTE E ENVIA PARA A TRIAGEM
// ======================================================

app.post("/atendimento", (req, res) => {

    try {

        const db = readDB();


        // Verificação básica
        if (!req.body.nome || !req.body.nome.trim()) {

            return res.status(400).json({

                erro: "O nome do paciente é obrigatório."

            });

        }


        if (!req.body.cpf || !req.body.cpf.trim()) {

            return res.status(400).json({

                erro: "O CPF do paciente é obrigatório."

            });

        }


        if (!req.body.tipo) {

            return res.status(400).json({

                erro: "O tipo de atendimento é obrigatório."

            });

        }


        // ==================================================
        // TODOS OS DADOS DO ATENDIMENTO SÃO SALVOS
        // ==================================================

        const paciente = {

            id: Date.now(),

            nome: req.body.nome.trim(),

            cpf: req.body.cpf.trim(),

            dataNascimento:
                req.body.dataNascimento || "",

            sexo:
                req.body.sexo || "",

            nomeMae:
                req.body.nomeMae || "",

            estadoCivil:
                req.body.estadoCivil || "",

            endereco:
                req.body.endereco || "",

            telefone:
                req.body.telefone || "",

            email:
                req.body.email || "",

            contatoEmergencia:
                req.body.contatoEmergencia || "",

            tipo:
                req.body.tipo || "",


            // IMPORTANTE:
            // O paciente começa aguardando a triagem.

            status: "triagem",


            createdAt:
                new Date().toISOString()

        };


        // Adiciona paciente ao banco

        db.pacientes.push(paciente);


        // Salva banco

        writeDB(db);


        // Retorna paciente criado

        res.status(201).json({

            sucesso: true,

            mensagem:
                "Paciente cadastrado e enviado para triagem.",

            paciente: paciente

        });


    } catch (error) {

        console.error(
            "Erro ao cadastrar paciente:",
            error
        );


        res.status(500).json({

            erro:
                "Erro interno ao cadastrar paciente."

        });

    }

});


// ======================================================
// LISTAR PACIENTES
// ======================================================

app.get("/pacientes", (req, res) => {

    try {

        const db = readDB();

        res.json(db.pacientes);

    } catch (error) {

        console.error(error);

        res.status(500).json({

            erro:
                "Erro ao carregar pacientes."

        });

    }

});


// ======================================================
// BUSCAR UM PACIENTE PELO ID
// ======================================================

app.get("/pacientes/:id", (req, res) => {

    const db = readDB();


    const paciente = db.pacientes.find(

        p =>
            String(p.id) ===
            String(req.params.id)

    );


    if (!paciente) {

        return res.status(404).json({

            erro:
                "Paciente não encontrado."

        });

    }


    res.json(paciente);

});


// ======================================================
// TRIAGEM
// ======================================================

app.post("/triagem", (req, res) => {

    try {

        const db = readDB();


        let risco = req.body.risco;


        const temperatura =
            Number(req.body.temperatura);


        // Classificação automática

        if (temperatura >= 39) {

            risco = "vermelho";

        } else if (temperatura >= 38) {

            risco = "amarelo";

        } else if (!risco) {

            risco = "verde";

        }


        const triagem = {

            id: Date.now(),

            nome:
                req.body.nome || "",

            sintoma:
                req.body.sintoma || "",

            temperatura:
                temperatura || 0,

            alergia:
                req.body.alergia || "",

            observacao:
                req.body.observacao || "",

            risco: risco,

            status:
                "aguardando_medico",

            createdAt:
                new Date().toISOString()

        };


        db.triagens.push(triagem);


        // ==================================================
        // ATUALIZA O PACIENTE
        // Ele deixa de aparecer na fila da triagem
        // ==================================================

        const paciente =
            db.pacientes.find(

                p =>
                    p.nome ===
                    req.body.nome

            );


        if (paciente) {

            paciente.status =
                "aguardando_medico";

            paciente.risco =
                risco;

            paciente.triagemId =
                triagem.id;

        }


        writeDB(db);


        res.status(201).json(triagem);


    } catch (error) {

        console.error(
            "Erro ao salvar triagem:",
            error
        );


        res.status(500).json({

            erro:
                "Erro ao salvar triagem."

        });

    }

});


// ======================================================
// LISTAR TRIAGENS
// ======================================================

app.get("/triagens", (req, res) => {

    const db = readDB();

    res.json(db.triagens);

});


// ======================================================
// MÍDIA INDOOR - TV
// ======================================================

app.post("/tv/chamar", (req, res) => {

    const db = readDB();


    const chamada = {

        id:
            Date.now().toString(),

        localTipo:
            req.body.localTipo,

        localNumero:
            req.body.localNumero,

        paciente:
            req.body.paciente,

        hora:
            new Date().toLocaleTimeString(
                "pt-BR",
                {
                    hour: "2-digit",
                    minute: "2-digit"
                }
            )

    };


    db.tv_chamada =
        chamada;


    db.tv_historico.unshift(
        chamada
    );


    if (
        db.tv_historico.length > 5
    ) {

        db.tv_historico.pop();

    }


    writeDB(db);


    res.json(chamada);

});


// ======================================================
// CONSULTAR CHAMADA DA TV
// ======================================================

app.get("/tv/chamada", (req, res) => {

    const db = readDB();


    res.json({

        chamada:
            db.tv_chamada,

        historico:
            db.tv_historico

    });

});


// ======================================================
// LISTA DE MEDICAÇÕES
// ======================================================

app.get("/lista-medicacoes", (req, res) => {

    res.json([

        "Dipirona",

        "Paracetamol",

        "Ibuprofeno",

        "Amoxicilina",

        "Azitromicina",

        "Loratadina",

        "Omeprazol",

        "Buscopan",

        "Dramin",

        "Soro fisiológico"

    ]);

});


// ======================================================
// CONSULTA MÉDICA
// ======================================================

app.post("/consulta", (req, res) => {

    const db = readDB();


    const consulta = {

        id:
            Date.now(),

        paciente:
            req.body.paciente,

        diagnostico:
            req.body.diagnostico,

        medicacao:
            req.body.medicacao,

        obs:
            req.body.obs,

        createdAt:
            new Date().toISOString()

    };


    db.consultas.push(
        consulta
    );


    writeDB(db);


    res.json(consulta);

});


// ======================================================
// MEDICAÇÕES / CONSULTAS
// ======================================================

app.get("/medicacoes", (req, res) => {

    const db = readDB();

    res.json(db.consultas);

});


// ======================================================
// INICIAR SERVIDOR
// ======================================================

const PORT =
    process.env.PORT || 3000;


app.listen(
    PORT,
    () => {

        console.log(
            `Servidor Sentinela rodando na porta ${PORT}`
        );

    }
);
```
