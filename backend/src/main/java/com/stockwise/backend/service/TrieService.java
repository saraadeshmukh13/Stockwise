
package com.stockwise.backend.service;

import java.util.*;

import org.springframework.stereotype.Service;

@Service
public class TrieService {

    class TrieNode {
        Map<Character, TrieNode> children = new HashMap<>();
        boolean isEndOfWord = false;
    }

    private TrieNode root = new TrieNode();

    // Insert product name into Trie
    public void insert(String word) {
        TrieNode current = root;

        for (char ch : word.toLowerCase().toCharArray()) {
            current.children.putIfAbsent(ch, new TrieNode());
            current = current.children.get(ch);
        }

        current.isEndOfWord = true;
    }

    // Search products by prefix
    public List<String> search(String prefix) {
        TrieNode current = root;

        for (char ch : prefix.toLowerCase().toCharArray()) {
            if (!current.children.containsKey(ch)) {
                return new ArrayList<>();
            }
            current = current.children.get(ch);
        }

        List<String> results = new ArrayList<>();
        collectWords(current, new StringBuilder(prefix.toLowerCase()), results);

        return results;
    }

    // Collect matching words
    private void collectWords(TrieNode node, StringBuilder word,
                              List<String> results) {

        if (node.isEndOfWord) {
            results.add(word.toString());
        }

        for (Map.Entry<Character, TrieNode> entry :
             node.children.entrySet()) {

            word.append(entry.getKey());
            collectWords(entry.getValue(), word, results);
            word.deleteCharAt(word.length() - 1);
        }
    }
}

