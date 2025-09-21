"""
Enhanced IR Dashboard Chatbot Service

This service provides intelligent search and conversation capabilities for the IR dashboard.

Features:
- Precise semantic search with field-specific matching
- AI-powered query parsing using Gemini
- Conversation context and memory
- Natural language response generation
- Follow-up suggestions
- Multi-district support with proper isolation

Main function: process_improved_chatbot_query(query, session_id)

Environment Variables Required:
- SUPABASE_URL: Your Supabase project URL
- SUPABASE_KEY: Your Supabase service role key
- GEMINI_API_KEY: Your Google Gemini API key
- IR_REPORTS_TABLE: Table name for this district (default: "ir_reports")
- DISTRICT_PREFIX: Unique prefix for this district (default: "default")

Multi-District Setup:
To use the same codebase for multiple districts, ensure each has:
1. Unique IR_REPORTS_TABLE (e.g., "district1_ir_reports", "district2_ir_reports")
2. Unique DISTRICT_PREFIX (e.g., "district1", "district2")
3. Same Supabase credentials but different tables
4. Sessions and rate limiting are automatically isolated per district

Example .env for District 1:
IR_REPORTS_TABLE=district1_ir_reports
DISTRICT_PREFIX=district1

Example .env for District 2:
IR_REPORTS_TABLE=district2_ir_reports
DISTRICT_PREFIX=district2
"""
import re
import os
import json
import asyncio
import time
import uuid
from typing import List, Dict, Any, Optional
from supabase import create_client, Client
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

# Initialize clients
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")
gemini_api_key = os.getenv("GEMINI_API_KEY")
# Table name can be configured per district
table_name = os.getenv("IR_REPORTS_TABLE", "ir_reports")  # Default to "ir_reports"
# District prefix for isolating sessions and rate limiting between districts
district_prefix = os.getenv("DISTRICT_PREFIX", "default")

if not supabase_url or not supabase_key:
    print("⚠️ Warning: Supabase credentials not found. Chatbot will use mock data.")
    supabase = None
else:
    supabase: Client = create_client(supabase_url, supabase_key)
    print(f"✅ Supabase initialized with table: {table_name} (district: {district_prefix})")

if gemini_api_key:
    genai.configure(api_key=gemini_api_key)
    gemini_model = genai.GenerativeModel('gemini-1.5-flash')
    print(f"✅ Gemini AI initialized for district: {district_prefix}")
    
    # Track rate limiting per district - using global dict with district keys
    if not hasattr(genai, '_district_rate_limits'):
        genai._district_rate_limits = {}
    
    if district_prefix not in genai._district_rate_limits:
        genai._district_rate_limits[district_prefix] = {
            'last_request': 0,
            'request_count': 0,
            'rate_limit': 8  # Conservative limit per district
        }
    
    # Get district-specific rate limiting vars
    district_rate_data = genai._district_rate_limits[district_prefix]
    gemini_last_request = district_rate_data['last_request']
    gemini_request_count = district_rate_data['request_count']
    gemini_rate_limit = district_rate_data['rate_limit']
else:
    gemini_model = None
    print(f"⚠️ Warning: Gemini API key not found. AI features disabled for district: {district_prefix}")

# Conversation sessions storage - isolated per district
conversation_sessions = {}

class ConversationManager:
    """Manage conversation context and history"""
    
    @classmethod
    def get_or_create_session(cls, session_id: str = None) -> Dict[str, Any]:
        """Get existing session or create new one - isolated per district"""
        if not session_id:
            session_id = str(uuid.uuid4())
        
        # Add district prefix to session ID for isolation
        district_session_id = f"{district_prefix}_{session_id}"
        
        if district_session_id not in conversation_sessions:
            conversation_sessions[district_session_id] = {
                "session_id": session_id,  # Original session ID for client
                "district_session_id": district_session_id,  # Internal ID with district
                "district": district_prefix,
                "created_at": time.time(),
                "last_activity": time.time(),
                "query_history": [],
                "context": {
                    "mentioned_people": set(),
                    "mentioned_locations": set(),
                    "mentioned_incidents": set(),
                    "current_focus": None,
                    "follow_up_suggestions": []
                }
            }
        
        return conversation_sessions[district_session_id]
    
    @classmethod
    def add_query_to_session(cls, session_id: str, query: str, intent: Dict, results: List[Dict]):
        """Add query and results to session history - district isolated"""
        session = cls.get_or_create_session(session_id)
        
        # Update session
        session["last_activity"] = time.time()
        session["query_history"].append({
            "query": query,
            "intent": intent,
            "timestamp": time.time(),
            "results_count": len(results)
        })
        
        # Update context
        context = session["context"]
        
        # Add entities to context
        if intent.get("entities"):
            entities = intent["entities"]
            if entities.get("persons"):
                if isinstance(context["mentioned_people"], list):
                    context["mentioned_people"] = set(context["mentioned_people"])
                context["mentioned_people"].update(entities["persons"])
            if entities.get("locations"):
                if isinstance(context["mentioned_locations"], list):
                    context["mentioned_locations"] = set(context["mentioned_locations"])
                context["mentioned_locations"].update(entities["locations"])
            if entities.get("incidents"):
                if isinstance(context["mentioned_incidents"], list):
                    context["mentioned_incidents"] = set(context["mentioned_incidents"])
                context["mentioned_incidents"].update(entities["incidents"])
        
        # Update current focus
        if intent.get("intent_type"):
            context["current_focus"] = intent["intent_type"]
        
        # Generate follow-up suggestions based on results
        context["follow_up_suggestions"] = cls._generate_follow_up_suggestions(results, intent)
        
        # Convert sets to lists for JSON serialization
        context["mentioned_people"] = list(context["mentioned_people"])
        context["mentioned_locations"] = list(context["mentioned_locations"])
        context["mentioned_incidents"] = list(context["mentioned_incidents"])
    
    @classmethod
    def _generate_follow_up_suggestions(cls, results: List[Dict], intent: Dict) -> List[str]:
        """Generate intelligent follow-up suggestions"""
        suggestions = []
        
        if not results:
            return ["Try searching for a different name or location"]
        
        # Extract common entities from results for suggestions
        people = set()
        locations = set()
        
        for result in results[:5]:  # Look at top 5 results
            metadata = result.get("metadata", {})
            
            # Main person
            if metadata.get("name"):
                people.add(metadata["name"])
            
            # Location
            if metadata.get("area_region"):
                locations.add(metadata["area_region"])
            
            # People met
            if metadata.get("maoists_met"):
                for person in metadata["maoists_met"][:3]:  # Top 3
                    if person.get("name"):
                        people.add(person["name"])
        
        # Generate suggestions based on intent type
        if intent.get("intent_type") == "person":
            # Suggest related people
            for person in list(people)[:3]:
                if person != intent.get("entities", {}).get("persons", [None])[0]:
                    suggestions.append(f"Tell me about {person}")
            
            # Suggest location-based queries
            for location in list(locations)[:2]:
                suggestions.append(f"What incidents happened in {location}?")
        
        elif intent.get("intent_type") == "location":
            # Suggest people from that location
            for person in list(people)[:3]:
                suggestions.append(f"Tell me about {person}")
            
            # Suggest incident queries
            suggestions.append("What weapons were found in this area?")
        
        elif intent.get("intent_type") == "incident":
            # Suggest people involved
            for person in list(people)[:2]:
                suggestions.append(f"What is {person}'s involvement?")
        
        return suggestions[:4]  # Return max 4 suggestions


class ImprovedQueryParser:
    """Improved query parser with conversation context"""
    
    @classmethod
    async def parse_query_with_context(cls, query: str, session_id: str = None) -> Dict[str, Any]:
        """Parse query with conversation context - district isolated"""
        # Get district-specific rate limiting data
        district_rate_data = getattr(genai, '_district_rate_limits', {}).get(district_prefix, {
            'last_request': 0, 'request_count': 0, 'rate_limit': 8
        })
        
        # Get session context
        session = ConversationManager.get_or_create_session(session_id) if session_id else None
        context = session.get("context", {}) if session else {}
        
        if not gemini_model:
            return cls._fallback_parse(query, context)
        
        # District-specific rate limiting
        current_time = time.time()
        if current_time - district_rate_data['last_request'] < 60:
            if district_rate_data['request_count'] >= district_rate_data['rate_limit']:
                print(f"⚠️ Rate limit reached for district {district_prefix}, using fallback parsing")
                return cls._fallback_parse(query, context)
        else:
            district_rate_data['request_count'] = 0
        
        try:
            # Build context-aware prompt
            context_info = ""
            if context:
                if context.get("mentioned_people"):
                    context_info += f"Previously mentioned people: {context['mentioned_people']}\n"
                if context.get("mentioned_locations"):
                    context_info += f"Previously mentioned locations: {context['mentioned_locations']}\n"
                if context.get("current_focus"):
                    context_info += f"Current conversation focus: {context['current_focus']}\n"
            
            prompt = f"""
            Analyze this user query about IR (Intelligence Reports) with conversation context:
            Query: "{query}"
            
            {context_info}
            
            Respond with JSON only:
            {{
                "intent_type": "person|location|incident|weapon|general",
                "entities": {{
                    "persons": ["exact person names mentioned"],
                    "locations": ["exact locations mentioned"],
                    "incidents": ["incidents/activities mentioned"],
                    "weapons": ["weapons mentioned"]
                }},
                "search_keywords": ["key terms for database search"],
                "confidence": 0.0-1.0,
                "is_follow_up": true/false,
                "references_previous": true/false
            }}
            
            Guidelines:
            - For person queries: Extract ONLY actual person names, not location parts like "patel" in "patelpara"
            - For locations: Extract place names, areas, districts
            - is_follow_up: true if this seems to be following up on previous conversation
            - references_previous: true if query references previously mentioned entities
            """
            
            response = await asyncio.to_thread(
                gemini_model.generate_content, prompt
            )
            
            # Update district-specific rate limiting
            district_rate_data['last_request'] = current_time
            district_rate_data['request_count'] += 1
            
            # Save back to global rate limits
            if not hasattr(genai, '_district_rate_limits'):
                genai._district_rate_limits = {}
            genai._district_rate_limits[district_prefix] = district_rate_data
            
            # Parse response
            response_text = response.text.strip()
            if response_text.startswith('```json'):
                response_text = response_text[7:]
            if response_text.endswith('```'):
                response_text = response_text[:-3]
            
            parsed = json.loads(response_text)
            parsed["originalQuery"] = query
            parsed["session_id"] = session_id
            
            print(f"🤖 AI parsed: {parsed['intent_type']} (confidence: {parsed['confidence']})")
            return parsed
            
        except Exception as e:
            print(f"❌ AI parsing failed: {e}")
            return cls._fallback_parse(query, context)
    
    @classmethod
    def _fallback_parse(cls, query: str, context: Dict = None) -> Dict[str, Any]:
        """Fallback parsing when AI is not available"""
        lower_query = query.lower()
        
        intent = {
            "intent_type": "general",
            "entities": {"persons": [], "locations": [], "incidents": [], "weapons": []},
            "search_keywords": [word for word in query.split() if len(word) > 2],
            "confidence": 0.5,
            "is_follow_up": False,
            "references_previous": False,
            "originalQuery": query
        }
        
        # Simple pattern matching
        if any(word in lower_query for word in ["who is", "tell me about", "about"]):
            intent["intent_type"] = "person"
            # Extract potential names (simple approach)
            words = query.split()
            for i, word in enumerate(words):
                if word.lower() in ["about", "is"] and i + 1 < len(words):
                    potential_name = " ".join(words[i+1:i+3])  # Take next 1-2 words
                    if len(potential_name.strip()) > 2:
                        intent["entities"]["persons"].append(potential_name.strip())
                        intent["confidence"] = 0.7
                        break
        
        return intent


class PreciseSemanticSearcher:
    """Precise semantic search with field-specific matching"""
    
    @classmethod
    async def search_reports_precise(cls, intent: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Search with precise field matching"""
        if not supabase:
            return cls._get_mock_reports(intent)
        
        try:
            # Get all reports from the configured table
            all_reports_result = supabase.table(table_name).select("*").limit(1000).execute()
            
            if not all_reports_result.data:
                print("📊 No reports found in database")
                return []
            
            all_reports = all_reports_result.data
            print(f"📊 Loaded {len(all_reports)} reports for precise search")
            
            # Filter with precise field matching
            filtered_reports = cls._filter_reports_precisely(all_reports, intent)
            
            # Rank by relevance
            ranked_reports = cls._rank_reports(filtered_reports, intent)
            
            return ranked_reports[:15]  # Return top 15
            
        except Exception as e:
            print(f"❌ Precise search error: {e}")
            return cls._get_mock_reports(intent)
    
    @classmethod
    def _filter_reports_precisely(cls, reports: List[Dict], intent: Dict[str, Any]) -> List[Dict]:
        """Filter reports with precise field matching"""
        filtered = []
        
        intent_type = intent.get("intent_type", "general")
        entities = intent.get("entities", {})
        
        for report in reports:
            metadata = report.get("metadata", {})
            if not metadata:
                continue
            
            match_score = 0
            match_reasons = []
            
            # PERSON SEARCH - Only match in person-specific fields
            if intent_type == "person" and entities.get("persons"):
                for person_query in entities["persons"]:
                    person_lower = person_query.lower().strip()
                    
                    # 1. Check main name field (highest priority)
                    main_name = metadata.get("name", "").lower()
                    if person_lower in main_name or main_name in person_lower:
                        match_score += 2.0
                        match_reasons.append(f"Main name match: {metadata.get('name')}")
                    
                    # 2. Check maoists_met array (people associated)
                    maoists_met = metadata.get("maoists_met", [])
                    if isinstance(maoists_met, list):
                        for maoist in maoists_met:
                            if isinstance(maoist, dict):
                                maoist_name = maoist.get("name", "").lower()
                                if person_lower in maoist_name or maoist_name in person_lower:
                                    match_score += 1.0
                                    match_reasons.append(f"Associated person: {maoist.get('name')}")
                    
                    # 3. DO NOT check location fields for person queries
                    # This prevents "patel" matching "patelpara" locations
            
            # LOCATION SEARCH - Only match in location-specific fields
            elif intent_type == "location" and entities.get("locations"):
                for location_query in entities["locations"]:
                    location_lower = location_query.lower().strip()
                    
                    # Check area_region
                    area_region = metadata.get("area_region", "").lower()
                    if location_lower in area_region:
                        match_score += 1.5
                        match_reasons.append(f"Area match: {metadata.get('area_region')}")
                    
                    # Check villages_covered
                    villages = metadata.get("villages_covered", [])
                    if isinstance(villages, list):
                        for village in villages:
                            if location_lower in str(village).lower():
                                match_score += 1.0
                                match_reasons.append(f"Village match: {village}")
            
            # INCIDENT SEARCH
            elif intent_type == "incident":
                # Check criminal_activities
                activities = metadata.get("criminal_activities", [])
                if isinstance(activities, list) and activities:
                    match_score += 1.0
                    match_reasons.append("Has criminal activities")
                    
                    # Check for specific incident keywords
                    search_keywords = intent.get("search_keywords", [])
                    for activity in activities:
                        if isinstance(activity, dict):
                            incident_text = str(activity.get("incident", "")).lower()
                            for keyword in search_keywords:
                                if keyword.lower() in incident_text:
                                    match_score += 0.5
            
            # WEAPON SEARCH
            elif intent_type == "weapon":
                weapons = metadata.get("weapons_assets", [])
                if isinstance(weapons, list) and weapons:
                    # Filter out empty or null weapons
                    valid_weapons = [w for w in weapons if w and str(w).strip() and str(w).strip() != "अज्ञात"]
                    if valid_weapons:
                        match_score += 1.0
                        match_reasons.append(f"Has weapons: {len(valid_weapons)}")
            
            # GENERAL SEARCH - Broader matching
            elif intent_type == "general":
                search_keywords = intent.get("search_keywords", [])
                searchable_text = cls._get_searchable_text(metadata).lower()
                
                for keyword in search_keywords:
                    if len(keyword) > 2 and keyword.lower() in searchable_text:
                        match_score += 0.3
            
            # Include if there's a match
            if match_score > 0:
                report["match_score"] = match_score
                report["match_reasons"] = match_reasons
                filtered.append(report)
        
        print(f"🔍 Precise filtering found {len(filtered)} relevant reports")
        return filtered
    
    @classmethod
    def _get_searchable_text(cls, metadata: Dict) -> str:
        """Get all searchable text from metadata"""
        text_parts = []
        
        # Basic fields
        for field in ["name", "area_region", "history", "involvement"]:
            if metadata.get(field):
                text_parts.append(str(metadata[field]))
        
        # Complex structures
        for field in ["criminal_activities", "maoists_met", "important_points"]:
            if metadata.get(field):
                text_parts.append(str(metadata[field]))
        
        return " ".join(text_parts)
    
    @classmethod
    def _rank_reports(cls, reports: List[Dict], intent: Dict[str, Any]) -> List[Dict]:
        """Rank reports by match score"""
        return sorted(reports, key=lambda r: r.get("match_score", 0), reverse=True)
    
    @classmethod
    def _get_mock_reports(cls, intent: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Mock reports for testing"""
        return []


class ContextualResponseGenerator:
    """Generate contextual responses with conversation awareness"""
    
    @classmethod
    async def generate_contextual_response(cls, reports: List[Dict[str, Any]], intent: Dict[str, Any], session_id: str = None) -> Dict[str, Any]:
        """Generate response with conversation context - district isolated"""
        # Get district-specific rate limiting data
        district_rate_data = getattr(genai, '_district_rate_limits', {}).get(district_prefix, {
            'last_request': 0, 'request_count': 0, 'rate_limit': 8
        })
        
        # Get session context
        session = ConversationManager.get_or_create_session(session_id) if session_id else None
        
        if not gemini_model:
            return cls._fallback_response(reports, intent, session)
        
        # District-specific rate limiting
        current_time = time.time()
        if current_time - district_rate_data['last_request'] < 60:
            if district_rate_data['request_count'] >= district_rate_data['rate_limit']:
                print(f"⚠️ Rate limit reached for district {district_prefix}, using fallback response")
                return cls._fallback_response(reports, intent, session)
        else:
            district_rate_data['request_count'] = 0
        
        try:
            # If no reports found, provide better guidance
            if not reports:
                return cls._generate_no_results_response(intent, session)
            
            # Prepare context
            context_summary = cls._prepare_context_summary(reports, intent)
            session_context = cls._prepare_session_context(session) if session else ""
            
            prompt = f"""
            You are an AI assistant for an Intelligence Reports (IR) dashboard. 
            User query: "{intent.get('originalQuery')}"
            Query type: {intent.get('intent_type')}
            
            {session_context}
            
            Search Results Summary:
            {context_summary}
            
            Generate a natural, conversational response that:
            1. Directly answers the user's question
            2. If NO relevant person found for a person query, clearly state "I couldn't find anyone named [name] in our reports"
            3. Highlights key findings from the reports
            4. Mentions specific names, locations, incidents when relevant
            5. Is informative but concise
            6. Uses natural language, not technical jargon
            
            IMPORTANT: If searching for a person and no relevant person is found, do NOT make up information or match irrelevant location names.
            """
            
            response = await asyncio.to_thread(
                gemini_model.generate_content, prompt
            )
            
            # Update district-specific rate limiting
            district_rate_data['last_request'] = current_time
            district_rate_data['request_count'] += 1
            
            # Save back to global rate limits
            if not hasattr(genai, '_district_rate_limits'):
                genai._district_rate_limits = {}
            genai._district_rate_limits[district_prefix] = district_rate_data
            
            # Create sources
            sources = []
            for report in reports[:5]:
                sources.append({
                    "reportId": report["id"],
                    "reportName": report["original_filename"],
                    "confidence": report.get("match_score", 0.5),
                    "matchReasons": report.get("match_reasons", [])
                })
            
            # Add to conversation history
            if session_id:
                ConversationManager.add_query_to_session(session_id, intent.get('originalQuery'), intent, reports)
                session = ConversationManager.get_or_create_session(session_id)
            
            return {
                "success": True,
                "response": response.text.strip(),
                "sources": sources,
                "intent": intent,
                "followUpSuggestions": session.get("context", {}).get("follow_up_suggestions", []) if session else [],
                "sessionId": session_id
            }
            
        except Exception as e:
            print(f"❌ Contextual response generation failed: {e}")
            return cls._fallback_response(reports, intent, session)
    
    @classmethod
    def _generate_no_results_response(cls, intent: Dict[str, Any], session: Dict = None) -> Dict[str, Any]:
        """Generate response when no results found"""
        query = intent.get('originalQuery', '')
        intent_type = intent.get('intent_type', 'general')
        
        if intent_type == "person":
            persons = intent.get("entities", {}).get("persons", [])
            if persons:
                name = persons[0]
                response = f"I couldn't find anyone named '{name}' in our intelligence reports database. The name might be spelled differently, or this person might not be in our records. Try checking the spelling or searching for a related name."
            else:
                response = "Please specify the name of the person you're looking for."
        else:
            response = f"I couldn't find any reports matching '{query}'. Try asking about specific people, locations, or incidents that might be in our intelligence database."
        
        suggestions = ["Search for a different name", "Try a location-based query", "Ask about recent incidents"]
        
        return {
            "success": True,
            "response": response,
            "sources": [],
            "intent": intent,
            "followUpSuggestions": suggestions,
            "sessionId": intent.get("session_id")
        }
    
    @classmethod
    def _prepare_context_summary(cls, reports: List[Dict], intent: Dict[str, Any]) -> str:
        """Prepare context summary"""
        if not reports:
            return "No relevant reports found."
        
        summary_parts = []
        
        # Count unique entities
        people = set()
        locations = set()
        
        for report in reports[:10]:
            metadata = report.get("metadata", {})
            
            if metadata.get("name"):
                people.add(metadata["name"])
            
            if metadata.get("area_region"):
                locations.add(metadata["area_region"])
        
        summary_parts.append(f"Found {len(reports)} reports")
        
        if people:
            summary_parts.append(f"People: {', '.join(list(people)[:5])}")
        
        if locations:
            summary_parts.append(f"Locations: {', '.join(list(locations)[:3])}")
        
        # Add match reasons for top reports
        top_matches = []
        for report in reports[:3]:
            reasons = report.get("match_reasons", [])
            if reasons:
                top_matches.extend(reasons[:2])
        
        if top_matches:
            summary_parts.append(f"Key matches: {', '.join(top_matches[:3])}")
        
        return "\n".join(summary_parts)
    
    @classmethod
    def _prepare_session_context(cls, session: Dict) -> str:
        """Prepare session context"""
        if not session:
            return ""
        
        context = session.get("context", {})
        context_parts = []
        
        if context.get("mentioned_people"):
            context_parts.append(f"Previously discussed people: {', '.join(context['mentioned_people'][:3])}")
        
        if context.get("mentioned_locations"):
            context_parts.append(f"Previously discussed locations: {', '.join(context['mentioned_locations'][:3])}")
        
        return "\n".join(context_parts) if context_parts else ""
    
    @classmethod
    def _fallback_response(cls, reports: List[Dict[str, Any]], intent: Dict[str, Any], session: Dict = None) -> Dict[str, Any]:
        """Fallback response"""
        if not reports:
            return cls._generate_no_results_response(intent, session)
        
        response = f"I found {len(reports)} report{'s' if len(reports) != 1 else ''} related to your query.\n\n"
        
        for i, report in enumerate(reports[:3]):
            metadata = report.get("metadata", {})
            response += f"{i+1}. **{report['original_filename']}**\n"
            
            if metadata.get("name"):
                response += f"   - Person: {metadata['name']}\n"
            
            if metadata.get("area_region"):
                response += f"   - Area: {metadata['area_region']}\n"
            
            response += "\n"
        
        if len(reports) > 3:
            response += f"... and {len(reports) - 3} more reports."
        
        sources = []
        for report in reports[:5]:
            sources.append({
                "reportId": report["id"],
                "reportName": report["original_filename"],
                "confidence": report.get("match_score", 0.5)
            })
        
        return {
            "success": True,
            "response": response,
            "sources": sources,
            "intent": intent,
            "followUpSuggestions": [],
            "sessionId": intent.get("session_id")
        }


async def process_improved_chatbot_query(query: str, session_id: str = None) -> Dict[str, Any]:
    """Main function for improved chatbot with conversation context"""
    try:
        print(f"🔍 Processing improved query: {query}")
        
        # 1. Parse with context
        intent = await ImprovedQueryParser.parse_query_with_context(query, session_id)
        print(f"📝 Parsed intent: {intent['intent_type']} (confidence: {intent['confidence']})")
        
        # 2. Precise semantic search
        reports = await PreciseSemanticSearcher.search_reports_precise(intent)
        print(f"📊 Found {len(reports)} reports with precise search")
        
        # 3. Generate contextual response
        response = await ContextualResponseGenerator.generate_contextual_response(reports, intent, session_id)
        print(f"✅ Generated contextual response")
        
        return response
        
    except Exception as e:
        print(f"❌ Error processing improved query: {e}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "response": "Sorry, I encountered an error while processing your request. Please try again.",
            "sources": [],
            "intent": {
                "intent_type": "general",
                "entities": {},
                "confidence": 0,
                "originalQuery": query
            },
            "followUpSuggestions": [],
            "sessionId": session_id
        }