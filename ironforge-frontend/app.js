const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000'
    : 'https://ironforge-backend.onrender.com'; // Placeholder, replace with actual backend domain if deployed

const workoutList = document.getElementById('workout-list');

// Function to fetch workouts from our backend engine
async function fetchWorkouts() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/workouts`);
        if (!response.ok) throw new Error("Failed to fetch workouts.");
        const workouts = await response.json();

        workoutList.innerHTML = '';

        workouts.forEach(workout => {
            const li = document.createElement('li');
            
            // Format date nicely
            let dateStr = '';
            if (workout.created_at) {
                const date = new Date(workout.created_at);
                dateStr = date.toLocaleDateString(undefined, { 
                    month: 'short', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }

            li.innerHTML = `
                <div class="workout-info">
                    <span class="workout-title"><strong>${workout.exercise}</strong></span>
                    <span class="workout-details">${workout.weight} lbs x ${workout.reps} reps x ${workout.sets} sets</span>
                    ${dateStr ? `<span class="workout-date">${dateStr}</span>` : ''}
                </div>
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
        const response = await fetch(`${API_BASE_URL}/api/workouts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newWorkout)
        });
        
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || "Failed to add workout.");
        }

        document.getElementById('exercise').value = '';
        document.getElementById('weight').value = '';
        document.getElementById('reps').value = '';
        document.getElementById('sets').value = '';
        fetchWorkouts(); // Refresh the workout list
    } catch (error) {
        console.error("Error adding workout:", error);
        alert(error.message);
    }
});

// Function to delete a workout
async function deleteWorkout(id) {
    try {
        // Send the DELETE request to the backend with the specific ID
        const response = await fetch(`${API_BASE_URL}/api/workouts/${id}`, {
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