```javascript
const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();

app.use(express.json());
app.use(cors());

app.use(express.static(path.join(__dirname, "../frontend")));

const DB_FILE = path.join(__dirname, "db.json");


/* =========================================================
   BANCO
========================================================= */

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

    const db =
        JSON.parse(
            fs.readFileSync(
                DB_FILE,
                "utf8"
            )
        );


    if (!db.usuarios)
        db.usuarios = [];

    if (!db.pacientes)
        db.pacientes = [];

    if (!db.triagens)
        db.triagens = [];

    if (!db.consultas)
        db.consultas = [];

    if (!db.tv_chamada)
        db.tv_chamada = null;

    if (!db.tv_historico)
        db.tv_historico = [];


    return db;

}


function writeDB(data) {

    fs.writeFileSync(
        DB_FILE,
        JSON.stringify(
            data,
            null,
            2
        )
    );

}


/* =========================================================
   LOGIN
========================================================= */

app.post(
    "/login",
    (req, res) => {

        const db = readDB();

        const user =
            db.usuarios.find(
                u =>
                    u.usuario ===
                        req.body.usuario &&
                    u.senha ===
                        req.body.senha
            );


        if (!user) {

            return res
                .status(401)
                .json({
                    erro:
                        "Login inválido"
                });

        }


        res.json(user);

    }
);


/* =========================================================
   ATENDIMENTO
   Recebe TODOS os dados do formulário
========================================================= */

app.post(
    "/atendimento",
    (req, res) => {

        try {

            const db = readDB();


            const paciente = {

                id: Date.now(),

                /* IDENTIFICAÇÃO */

                nome:
                    req.body.nome || "",

                cpf:
                    req.body.cpf || "",

                rg:
                    req.body.rg || "",

                dataNascimento:
                    req.body.dataNascimento || "",

                sexo:
                    req.body.sexo || "",


                /* RESPONSÁVEL */

                nomeMae:
                    req.body.nomeMae || "",

                responsavel:
                    req.body.responsavel || "",

                parentesco:
                    req.body.parentesco || "",


                /* PEDIATRIA */

                peso:
                    req.body.peso || "",

                altura:
                    req.body.altura || "",

                tipoSanguineo:
                    req.body.tipoSanguineo || "",

                vacinacao:
                    req.body.vacinacao || "",

                alergias:
                    req.body.alergias || "",

                medicamentos:
                    req.body.medicamentos || "",

                condicoes:
                    req.body.condicoes || "",


                /* CONTATO */

                endereco:
                    req.body.endereco || "",

                paisTelefone:
                    req.body.paisTelefone || "",

                telefone:
                    req.body.telefone || "",

                email:
                    req.body.email || "",

                contatoEmergencia:
                    req.body.contatoEmergencia || "",


                /* ATENDIMENTO */

                tipo:
                    req.body.tipo || "",


                /* CONTROLE */

                status:
                    "triagem",

                createdAt:
                    new Date().toISOString()

            };


            db.pacientes.push(
                paciente
            );


            writeDB(db);


            console.log(
                "Paciente enviado para triagem:",
                paciente.nome
            );


            res.status(201).json({
                sucesso: true,
                mensagem:
                    "Paciente enviado para a triagem.",
                paciente
            });


        } catch (erro) {

            console.error(
                "Erro ao cadastrar paciente:",
                erro
            );


            res
                .status(500)
                .json({
                    erro:
                        "Erro interno ao cadastrar paciente."
                });

        }

    }
);


/* =========================================================
   LISTAR PACIENTES DA FILA
========================================================= */

app.get(
    "/pacientes",
    (req, res) => {

        const db = readDB();

        const fila =
            db.pacientes.filter(
                paciente =>
                    paciente.status ===
                    "triagem"
            );


        res.json(fila);

    }
);


/* =========================================================
   BUSCAR UM PACIENTE PELO ID
========================================================= */

app.get(
    "/pacientes/:id",
    (req, res) => {

        const db = readDB();

        const paciente =
            db.pacientes.find(
                p =>
                    String(p.id) ===
                    String(req.params.id)
            );


        if (!paciente) {

            return res
                .status(404)
                .json({
                    erro:
                        "Paciente não encontrado."
                });

        }


        res.json(paciente);

    }
);


/* =========================================================
   TRIAGEM
========================================================= */

app.post(
    "/triagem",
    (req, res) => {

        try {

            const db = readDB();


            let risco =
                req.body.risco;


            const temperatura =
                Number(
                    req.body.temperatura
                );


            if (
                temperatura >= 39
            ) {

                risco =
                    "vermelho";

            } else if (
                temperatura >= 38
            ) {

                risco =
                    "amarelo";

            } else if (!risco) {

                risco =
                    "verde";

            }


            const triagem = {

                id: Date.now(),

                pacienteId:
                    req.body.pacienteId ||
                    null,

                nome:
                    req.body.nome || "",

                sintoma:
                    req.body.sintoma || "",

                temperatura:
                    req.body.temperatura || "",

                alergia:
                    req.body.alergia || "",

                observacao:
                    req.body.observacao || "",

                risco,

                status:
                    "aguardando_medico",

                createdAt:
                    new Date().toISOString()

            };


            db.triagens.push(
                triagem
            );


            /*
             * Quando o paciente termina
             * a triagem, ele sai da fila
             * de pacientes aguardando.
             */

            if (
                req.body.pacienteId
            ) {

                const paciente =
                    db.pacientes.find(
                        p =>
                            String(p.id) ===
                            String(
                                req.body.pacienteId
                            )
                    );


                if (paciente) {

                    paciente.status =
                        "aguardando_medico";

                    paciente.risco =
                        risco;

                }

            }


            writeDB(db);


            res.status(201).json(
                triagem
            );


        } catch (erro) {

            console.error(
                "Erro na triagem:",
                erro
            );


            res
                .status(500)
                .json({
                    erro:
                        "Erro interno ao salvar triagem."
                });

        }

    }
);


/* =========================================================
   LISTAR TRIAGENS
========================================================= */

app.get(
    "/triagens",
    (req, res) => {

        const db = readDB();

        res.json(
            db.triagens
        );

    }
);


/* =========================================================
   TV
========================================================= */

app.post(
    "/tv/chamar",
    (req, res) => {

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
                new Date()
                    .toLocaleTimeString(
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
            db.tv_historico.length >
            5
        ) {

            db.tv_historico.pop();

        }


        writeDB(db);


        res.json(
            chamada
        );

    }
);


/* =========================================================
   BUSCAR CHAMADA DA TV
========================================================= */

app.get(
    "/tv/chamada",
    (req, res) => {

        const db = readDB();


        res.json({

            chamada:
                db.tv_chamada,

            historico:
                db.tv_historico

        });

    }
);


/* =========================================================
   LISTA DE MEDICAÇÕES
========================================================= */

app.get(
    "/lista-medicacoes",
    (req, res) => {

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

    }
);


/* =========================================================
   CONSULTA MÉDICA
========================================================= */

app.post(
    "/consulta",
    (req, res) => {

        const db = readDB();


        const consulta = {

            id: Date.now(),

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


        res.json(
            consulta
        );

    }
);


/* =========================================================
   MEDICAÇÕES
========================================================= */

app.get(
    "/medicacoes",
    (req, res) => {

        const db = readDB();

        res.json(
            db.consultas
        );

    }
);


/* =========================================================
   INICIAR SERVIDOR
========================================================= */

const PORT =
    process.env.PORT ||
    3000;


app.listen(
    PORT,
    () => {

        console.log(
            `Servidor Sentinela rodando na porta ${PORT}`
        );

    }
);
```
