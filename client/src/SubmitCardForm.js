import React, { useState } from "react";
import { Box, Button, TextField, Typography, MenuItem, Paper, Stack } from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { submitRawData } from "./api";

const hierarchyFields = ["subject", "module", "chapter", "section", "topic"];

export default function SubmitCardForm() {
  const [fields, setFields] = useState({ subject: "", module: "", chapter: "", section: "", topic: "" });
  const [rawText, setRawText] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: submitRawData,
    onSuccess: () => {
      setSuccess(true);
      setError("");
      setRawText("");
      queryClient.invalidateQueries(["review-cards"]);
    },
    onError: (err) => {
      setError(err?.response?.data?.error || "Submission failed");
    },
  });

  const handleChange = (e) => {
    setFields((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate({ ...fields, rawText });
  };

  return (
    <Paper sx={{ p: 3, mb: 4, maxWidth: 500, mx: "auto" }}>
      <Typography variant="h6" gutterBottom>Submit New Content</Typography>
      <form onSubmit={handleSubmit}>
        <Stack spacing={2}>
          {hierarchyFields.map((field) => (
            <TextField
              key={field}
              label={field.charAt(0).toUpperCase() + field.slice(1)}
              name={field}
              value={fields[field]}
              onChange={handleChange}
              required={field === "subject"}
            />
          ))}
          <TextField
            label="Raw Text (one sentence per line, blank lines for paragraphs)"
            multiline
            minRows={4}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            required
          />
          <Button type="submit" variant="contained" disabled={mutation.isLoading}>
            Submit
          </Button>
        </Stack>
      </form>
      {success && <Typography color="success.main" sx={{ mt: 2 }}>Submitted successfully!</Typography>}
      {error && <Typography color="error.main" sx={{ mt: 2 }}>{error}</Typography>}
    </Paper>
  );
}
