# trimer_utils.py
import pandas as pd
from collections import Counter

def read_fna(file_content: str) -> str:
    """
    Reads a .fna file content as string, removes headers (lines starting with '>'),
    concatenates sequence lines, converts to uppercase, and removes non-ATGC characters.
    """
    lines = file_content.splitlines()
    seq = ""
    for line in lines:
        if line.startswith(">"):
            continue  # skip header
        seq += line.strip().upper()
    # Keep only valid nucleotides
    seq = ''.join([nuc for nuc in seq if nuc in {"A", "T", "G", "C"}])
    return seq

def extract_trimer_counts(sequence: str) -> Counter:
    """
    Counts all valid 3-mers in the sequence.
    """
    trimer_counts = Counter()
    for i in range(len(sequence) - 2):
        trimer = sequence[i:i+3]
        trimer_counts[trimer] += 1
    return trimer_counts

def calculate_trimer_frequencies(sequence: str, all_trimers: list) -> pd.DataFrame:
    """
    Calculates normalized 3-mer frequencies based on the provided feature list.
    
    Parameters:
    - sequence: DNA sequence string
    - all_trimers: list of 3-mers used in training (features.pkl)
    
    Returns:
    - DataFrame with a single row of normalized 3-mer frequencies
    """
    counts = extract_trimer_counts(sequence)
    total = sum(counts.values())
    
    # Build row dict for all features
    row = {}
    for trimer in all_trimers:
        # Frequency = count / total counts
        row[trimer] = counts.get(trimer, 0) / total if total > 0 else 0.0
    
    df = pd.DataFrame([row], columns=all_trimers)  # ensures correct column order
    return df