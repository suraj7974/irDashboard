"""
Gemini AI client for IR Dashboard
Simplified to use only Google Gemini models
"""

import os
import time
from typing import List, Dict, Any
from dotenv import load_dotenv

# Import Gemini provider
try:
    import google.generativeai as genai

    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    print("⚠️ Google Gemini not available")

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))


class GeminiAIClient:
    def __init__(self):
        self.providers = []
        self.current_provider_index = 0

        # Initialize Gemini if available
        if GEMINI_AVAILABLE and os.getenv("GEMINI_API_KEY"):
            self._setup_gemini()

        if not self.providers:
            print(
                "❌ No AI providers available! Please set GEMINI_API_KEY"
            )
        else:
            print(f"✅ Initialized {len(self.providers)} Gemini model(s)")

    def _setup_gemini(self):
        """Setup Google Gemini provider"""
        try:
            genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

            gemini_models = [
                {
                    "name": "gemini-2.5-pro",
                    "context_window": 2000000,  # 2M tokens!!
                    "max_tokens": 8192,
                    "provider": "gemini",
                    "client": genai.GenerativeModel("gemini-2.5-pro"),
                    "description": "Latest and most capable 2.5 Pro with 2M context",
                },
                {
                    "name": "gemini-1.5-pro",
                    "context_window": 2000000,  # 2M tokens!!
                    "max_tokens": 8192,
                    "provider": "gemini",
                    "client": genai.GenerativeModel("gemini-1.5-pro"),
                    "description": "Most capable with 2M context window",
                },
                {
                    "name": "gemini-1.5-flash",
                    "context_window": 1000000,  # 1M tokens!
                    "max_tokens": 8192,
                    "provider": "gemini",
                    "client": genai.GenerativeModel("gemini-1.5-flash"),
                    "description": "Ultra-fast with massive 1M context window",
                },
                {
                    "name": "gemini-2.0-flash-exp",
                    "context_window": 1000000,  # 1M tokens
                    "max_tokens": 8192,
                    "provider": "gemini",
                    "client": genai.GenerativeModel("gemini-2.0-flash-exp"),
                    "description": "Latest experimental model",
                },
                {
                    "name": "gemini-1.5-flash-8b",
                    "context_window": 1000000,  # 1M tokens
                    "max_tokens": 8192,
                    "provider": "gemini",
                    "client": genai.GenerativeModel("gemini-1.5-flash-8b"),
                    "description": "Lightweight and fast 8B parameter model",
                },
            ]

            self.providers.extend(gemini_models)
            print(f"✅ Added {len(gemini_models)} Gemini models")

        except Exception as e:
            print(f"⚠️ Gemini setup failed: {e}")

    def get_current_provider(self):
        """Get the currently selected provider"""
        if not self.providers:
            return None
        return self.providers[self.current_provider_index]

    def switch_to_next_provider(self):
        """Switch to the next available provider"""
        if not self.providers:
            return

        self.current_provider_index = (self.current_provider_index + 1) % len(
            self.providers
        )
        current = self.get_current_provider()
        print(f"🔄 Switching to: {current['provider'].upper()} - {current['name']}")
        print(f"   📏 Context window: {current['context_window']:,} tokens")
        print(f"   📝 Description: {current['description']}")

    def print_provider_info(self):
        """Print information about all available Gemini models"""
        print(f"\n🤖 Available Gemini Models ({len(self.providers)} models):")
        print("=" * 70)

        for i, model in enumerate(self.providers):
            status = (
                "🟢 CURRENT"
                if i == self.current_provider_index
                else "⚪ Available"
            )
            print(f"   {status} {model['name']}")
            print(f"          Context: {model['context_window']:,} tokens")
            print(f"          Info: {model['description']}")
        print()

    def chat_completion(
        self, messages, temperature=0.2, max_tokens=None, max_retries=3
    ):
        """
        Create chat completion with automatic provider fallback
        """
        if not self.providers:
            raise Exception("No AI providers available. Please check your API keys.")

        original_index = self.current_provider_index
        attempts = 0

        while attempts < len(self.providers) * max_retries:
            current = self.get_current_provider()
            attempts += 1

            try:
                # Use provider-specific max_tokens if not specified
                if max_tokens is None:
                    max_tokens = current["max_tokens"]

                if current["provider"] == "gemini":
                    response = self._gemini_completion(
                        current, messages, temperature, max_tokens
                    )
                else:
                    raise Exception(f"Unknown provider: {current['provider']}")

                print(
                    f"✅ Success with {current['provider'].upper()}: {current['name']}"
                )
                return response

            except Exception as e:
                error_msg = str(e).lower()
                print(
                    f"❌ Error with {current['provider'].upper()} {current['name']}: {str(e)}"
                )

                # Check for quota/rate limit errors
                if any(
                    keyword in error_msg
                    for keyword in ["quota", "rate", "limit", "billing", "exceeded"]
                ):
                    print(f"🚫 Quota/Rate limit reached for {current['name']}")
                    self.switch_to_next_provider()
                    continue

                # Check for context window errors
                elif any(
                    keyword in error_msg
                    for keyword in ["context", "token", "too large", "too long"]
                ):
                    print(f"📏 Context window exceeded for {current['name']}")
                    self.switch_to_next_provider()
                    continue

                # For other errors, retry with same provider first
                else:
                    if attempts % max_retries != 0:
                        print(f"⏳ Retrying in 2 seconds... (attempt {attempts})")
                        time.sleep(2)
                        continue
                    else:
                        # Max retries reached, try next provider
                        self.switch_to_next_provider()
                        continue

        # If we've tried all providers, raise error
        raise Exception(f"All providers failed after {attempts} attempts")

    def _gemini_completion(self, provider_config, messages, temperature, max_tokens):
        """Handle Gemini completion"""
        # Convert OpenAI format to Gemini format
        if len(messages) == 1 and messages[0]["role"] == "user":
            prompt = messages[0]["content"]
        else:
            # For multi-message conversations, combine them
            prompt = ""
            for msg in messages:
                if msg["role"] == "system":
                    prompt += f"Instructions: {msg['content']}\n\n"
                elif msg["role"] == "user":
                    prompt += f"User: {msg['content']}\n\n"
                elif msg["role"] == "assistant":
                    prompt += f"Assistant: {msg['content']}\n\n"

        # Generate response
        model = provider_config["client"]
        response = model.generate_content(
            prompt,
            generation_config={
                "temperature": temperature,
                "max_output_tokens": min(max_tokens, provider_config["max_tokens"]),
            },
        )

        # Convert to OpenAI-like format
        class GeminiResponse:
            def __init__(self, text):
                self.choices = [GeminiChoice(text)]

        class GeminiChoice:
            def __init__(self, text):
                self.message = GeminiMessage(text)

        class GeminiMessage:
            def __init__(self, text):
                self.content = text

        return GeminiResponse(response.text)

    def count_tokens_estimate(self, text):
        """Rough token estimation (1 token ≈ 4 characters for most models)"""
        return len(text) // 4

    def get_optimal_chunk_size(self, safety_margin=0.7):
        """Get optimal chunk size for current provider with safety margin"""
        current = self.get_current_provider()
        if not current:
            return 8000  # fallback

        context_window = current["context_window"]
        optimal_size = int(context_window * safety_margin)

        print(f"📏 Provider: {current['provider'].upper()} - {current['name']}")
        print(f"   Context window: {context_window:,} tokens")
        print(
            f"   Optimal chunk size: {optimal_size:,} tokens ({safety_margin*100:.0f}% of context)"
        )

        return optimal_size

    def split_text_adaptive(self, text, safety_margin=0.7):
        """Split text into chunks based on current provider's context window"""
        chunk_size = self.get_optimal_chunk_size(safety_margin)

        # Convert to character estimate (1 token ≈ 4 chars)
        max_chars = chunk_size * 4

        chunks = []
        lines = text.split("\n")
        current_chunk = []
        current_chars = 0

        for line in lines:
            line_chars = len(line) + 1  # +1 for newline

            if current_chars + line_chars > max_chars and current_chunk:
                chunks.append("\n".join(current_chunk))
                current_chunk = [line]
                current_chars = line_chars
            else:
                current_chunk.append(line)
                current_chars += line_chars

        if current_chunk:
            chunks.append("\n".join(current_chunk))

        print(
            f"📝 Split text into {len(chunks)} adaptive chunks (max {chunk_size:,} tokens each)"
        )

        # Verify chunk sizes
        for i, chunk in enumerate(chunks):
            chunk_tokens = self.count_tokens_estimate(chunk)
            if chunk_tokens > chunk_size:
                print(
                    f"⚠️  Chunk {i+1} has {chunk_tokens:,} tokens (exceeds {chunk_size:,} limit)"
                )

        return chunks

    def get_max_context_window(self):
        """Get the context window of the current provider"""
        current = self.get_current_provider()
        return current["context_window"] if current else 8000
