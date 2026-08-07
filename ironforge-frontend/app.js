const workoutList = document.getElementById('workout-list');

// Function to fetch workouts from our backend engine
async function fetchWorkouts() {
    try {
        const response = await fetch('http://localhost:3000/api/workouts');
        if (!response.ok) throw new Error("Failed to fetch workouts.");
        const workouts = await response.json();

        workoutList.innerHTML = '';

        workouts.forEach(workout => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span><strong>${workout.exercise}</strong> - ${workout.weight} lbs x ${workout.reps} reps x ${workout.sets} sets</span>
                <button class="delete-btn" onclick="deleteWorkout(${workout.id})">X</button>
            `;
            workoutList.appendChild(li);
        });
    } catch (error) {
        console.error("Error fetching workouts:", error);
        workoutList.innerHTML = '<li>Error loading workouts. Is the server running?</li>';
    }
}

// Run this function immediately when the page loads
fetchWorkouts();

const addBtn = document.getElementById('add-btn');
addBtn.addEventListener("click", async () => {
    const exercise = document.getElementById('exercise').value;
    const weight = document.getElementById('weight').value;
    const reps = document.getElementById('reps').value;
    const sets = document.getElementById('sets').value;

    if (!exercise || !weight || !reps || !sets) {
        alert("Please fill in all fields.");
        return;
    }
    const newWorkout = {
        exercise: exercise,
        weight: weight,
        reps: reps,
        sets: sets
    };
    try {
        const response = await fetch('http://localhost:3000/api/workouts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newWorkout)
        });
        if (!response.ok) throw new Error("Failed to add workout.");
        document.getElementById('exercise').value = '';
        document.getElementById('weight').value = '';
        document.getElementById('reps').value = '';
        document.getElementById('sets').value = '';
        fetchWorkouts(); // Refresh the workout list
    } catch (error) {
        console.error("Error adding workout:", error);
        alert("Failed to add workout. Please check if the server is running.");
    }
});
// Function to delete a workout
async function deleteWorkout(id) {
    try {
        // Send the DELETE request to the backend with the specific ID
        const response = await fetch(`http://localhost:3000/api/workouts/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error("Failed to delete workout.");

        // Refresh the list so the deleted item disappears from the screen!
        fetchWorkouts();

    } catch (error) {
        console.error("Error deleting workout:", error);
        alert("Failed to delete workout.");
    }
}