import { createSlice } from '@reduxjs/toolkit';
import { fetchParties, addParty, updateParty, deleteParty } from '../thunks/partyThunk';

const partySlice = createSlice({
    name: 'party',
    initialState: {
        parties: [],
        loading: false,
        error: null,
        success: false,
    },
    reducers: {
        clearPartyStatus: (state) => {
            state.success = false;
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // Fetch Parties
            .addCase(fetchParties.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchParties.fulfilled, (state, action) => {
                state.loading = false;
                state.parties = Array.isArray(action.payload) ? action.payload : [];
            })
            .addCase(fetchParties.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            // Add Party
            .addCase(addParty.pending, (state) => {
                state.loading = true;
                state.success = false;
                state.error = null;
            })
            .addCase(addParty.fulfilled, (state, action) => {
                state.loading = false;
                state.success = true;
                // Append the new party to the list
                state.parties.unshift(action.payload);
            })
            .addCase(addParty.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            // Update Party
            .addCase(updateParty.pending, (state) => {
                state.loading = true;
                state.success = false;
                state.error = null;
            })
            .addCase(updateParty.fulfilled, (state, action) => {
                state.loading = false;
                state.success = true;
                const updatedParty = action.payload;
                state.parties = state.parties.map((p) =>
                    p._id === updatedParty._id ? updatedParty : p
                );
            })
            .addCase(updateParty.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            // Delete Party
            .addCase(deleteParty.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(deleteParty.fulfilled, (state, action) => {
                state.loading = false;
                const deletedId = action.payload.id;
                // Remove or update the status of the soft-deleted party
                state.parties = state.parties.filter((p) => p._id !== deletedId);
            })
            .addCase(deleteParty.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    },
});

export const { clearPartyStatus } = partySlice.actions;
export default partySlice.reducer;



//It is the file responsible for storing party data, loading status, success status, and errors in Redux, and updating that state whenever API calls succeed or fail
//Without it, Redux would have no idea what to do with the data returned by your thunks.
