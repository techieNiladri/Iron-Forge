require('dotenv').config();
const cors = require("cors");
const express = require("express");
const app = express();

const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

pool.connect()
.then(() => console.log('Connected to PostgreSQL database'))
.catch(err => console.error('Error connecting to PostgreSQL database', err));


app.use(cors());
const port = process.env.PORT || 3000;
app.use(express.json());

app.get('/api/workouts', async (req,res)=>{
    try {
        const result = await pool.query('SELECT * FROM workouts ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.post('/api/workouts', async (req,res) =>{
    const { exercise, weight, reps, sets } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO workouts (exercise, weight, reps, sets) VALUES ($1, $2, $3, $4) RETURNING *',
            [exercise, weight, reps, sets || 1]
        );
        res.json( {message: "Workout added successfully!", workout: result.rows[0]} );
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.delete('/api/workouts/:id', async (req,res)=>{
    const idToDelete = Number(req.params.id);
    try {
        const result = await pool.query('DELETE FROM workouts WHERE id = $1 RETURNING *', [idToDelete]);
        if(result.rowCount === 0){
            return res.status(404).json({message: "Workout not found!"});
        }
        res.json({message: "Workout deleted successfully!"});
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.listen(port, ()=>{
    console.log(`Server is running on port ${port}`);
});