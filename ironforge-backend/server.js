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
    
    // Input validation
    if (!exercise || typeof exercise !== 'string' || exercise.trim() === '') {
        return res.status(400).json({ error: "Exercise name is required and must be a valid text." });
    }
    
    const parsedWeight = parseInt(weight, 10);
    const parsedReps = parseInt(reps, 10);
    const parsedSets = parseInt(sets, 10);

    if (isNaN(parsedWeight) || parsedWeight < 0) {
        return res.status(400).json({ error: "Weight must be a non-negative number." });
    }
    if (isNaN(parsedReps) || parsedReps <= 0) {
        return res.status(400).json({ error: "Reps must be a positive number." });
    }
    if (isNaN(parsedSets) || parsedSets <= 0) {
        return res.status(400).json({ error: "Sets must be a positive number." });
    }

    try {
        const result = await pool.query(
            'INSERT INTO workouts (exercise, weight, reps, sets) VALUES ($1, $2, $3, $4) RETURNING *',
            [exercise.trim(), parsedWeight, parsedReps, parsedSets]
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