import os
import logging
from typing import List, Dict, Any, Optional, Set, Tuple
from datetime import datetime, timezone
import asyncio
import re
import yaml

from dotenv import load_dotenv

from .chunker import DocumentChunk

# Try to import Graphiti and Neo4j
try:
    from graphiti_core import Graphiti
    GRAPHITI_AVAILABLE = True
except ImportError:
    GRAPHITI_AVAILABLE = False

try:
    from neo4j import AsyncGraphDatabase
    NEO4J_AVAILABLE = True
except ImportError:
    NEO4J_AVAILABLE = False

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

# Log availability after logger is defined
if not GRAPHITI_AVAILABLE:
    logger.warning("graphiti_core not available. Using direct Neo4j integration.")
if not NEO4J_AVAILABLE:
    logger.warning("neo4j driver not available. Graph building will be disabled.")


class GraphitiClient:
    """Simple wrapper for Neo4j graph operations with insurance ontology support."""
    
    def __init__(self):
        """Initialize Neo4j client."""
        if not NEO4J_AVAILABLE:
            logger.warning("Neo4j driver not available. Graph operations will be disabled.")
            self.driver = None
            self._initialized = False
            return
        
        # Get Neo4j connection details from environment
        self.uri = os.getenv("NEO4J_URI", "neo4j://localhost:7687")
        self.username = os.getenv("NEO4J_USER", "neo4j")
        self.password = os.getenv("NEO4J_PASSWORD", "password")
        
        # Initialize client
        self.driver = None
        self._initialized = False
    
    async def initialize(self):
        """Initialize the Neo4j client."""
        if not NEO4J_AVAILABLE:
            logger.warning("Neo4j driver not available, skipping graph initialization")
            return
        
        if not self._initialized:
            try:
                # Initialize Neo4j driver
                self.driver = AsyncGraphDatabase.driver(
                    self.uri,
                    auth=(self.username, self.password)
                )
                
                # Test connection
                async with self.driver.session() as session:
                    result = await session.run("RETURN 1 as test")
                    await result.consume()
                
                self._initialized = True
                logger.info(f"Neo4j client initialized with URI: {self.uri}")
                
                # Create indexes for better performance
                await self._create_indexes()
                
            except Exception as e:
                logger.error(f"Failed to initialize Neo4j client: {e}")
                self.driver = None
                self._initialized = False
                logger.warning("Continuing without graph functionality")
    
    async def close(self):
        """Close the Neo4j client."""
        if self._initialized and self.driver:
            try:
                await self.driver.close()
            except Exception as e:
                logger.warning(f"Error closing Neo4j client: {e}")
            finally:
                self._initialized = False
                logger.info("Neo4j client closed")
    
    async def _create_indexes(self):
        """Create Neo4j indexes for better performance."""
        indexes = [
            "CREATE INDEX IF NOT EXISTS FOR (d:Document) ON (d.doc_id)",
            "CREATE INDEX IF NOT EXISTS FOR (p:Policy) ON (p.policy_number)",
            "CREATE INDEX IF NOT EXISTS FOR (c:Chunk) ON (c.chunk_id)",
            "CREATE INDEX IF NOT EXISTS FOR (b:Benefit) ON (b.benefit_id)",
            "CREATE INDEX IF NOT EXISTS FOR (r:Rider) ON (r.code)"
        ]
        
        async with self.driver.session() as session:
            for index_query in indexes:
                try:
                    await session.run(index_query)
                except Exception as e:
                    logger.warning(f"Failed to create index: {e}")
    
    async def add_episode(self, episode_id: str, content: str, source: str, 
                         timestamp: datetime, metadata: Optional[Dict[str, Any]] = None):
        """Add a document episode to the knowledge graph."""
        if not self._initialized or not self.driver:
            logger.warning("Neo4j client not initialized, skipping episode addition")
            return
        
        try:
            async with self.driver.session() as session:
                # Create Document node
                doc_query = """
                MERGE (d:Document {doc_id: $episode_id})
                SET d.title = $title,
                    d.source = $source,
                    d.content = $content,
                    d.timestamp = $timestamp,
                    d.metadata = $metadata
                RETURN d
                """
                
                await session.run(doc_query, {
                    "episode_id": episode_id,
                    "title": metadata.get("document_title", "Unknown") if metadata else "Unknown",
                    "source": source,
                    "content": content[:5000],  # Limit content size
                    "timestamp": timestamp.isoformat(),
                    "metadata": str(metadata) if metadata else "{}"
                })
                
                # Extract and create insurance entities from content
                await self._extract_and_create_entities(session, episode_id, content, metadata)
                
                logger.info(f"Added episode {episode_id} to Neo4j graph")
                
        except Exception as e:
            logger.error(f"Failed to add episode {episode_id} to Neo4j: {e}")
    
    async def _extract_and_create_entities(self, session, doc_id: str, content: str, metadata: Optional[Dict[str, Any]] = None):
        """Extract and create insurance entities in Neo4j."""
        try:
            # Extract policy information
            policies = self._extract_simple_policies(content)
            for policy in policies:
                await self._create_policy_node(session, doc_id, policy)
            
            # Extract benefits
            benefits = self._extract_simple_benefits(content)
            for benefit in benefits:
                await self._create_benefit_node(session, doc_id, benefit)
            
            # Extract terms
            terms = self._extract_simple_terms(content)
            for term in terms:
                await self._create_term_node(session, doc_id, term)
                
        except Exception as e:
            logger.error(f"Failed to extract entities for document {doc_id}: {e}")
    
    def _extract_simple_policies(self, content: str) -> List[Dict[str, Any]]:
        """Simple policy extraction."""
        policies = []
        
        # Look for policy numbers
        policy_patterns = [
            r'Policy\s+(?:Number|No\.?)\s*:?\s*([A-Z0-9\-/]+)',
            r'Contract\s+(?:Number|No\.?)\s*:?\s*([A-Z0-9\-/]+)'
        ]
        
        for pattern in policy_patterns:
            matches = re.finditer(pattern, content, re.IGNORECASE)
            for match in matches:
                policies.append({
                    "policy_number": match.group(1),
                    "type": "extracted_policy",
                    "context": match.group(0)
                })
        
        return policies
    
    def _extract_simple_benefits(self, content: str) -> List[Dict[str, Any]]:
        """Simple benefit extraction."""
        benefits = []
        
        # Look for monetary amounts as benefits
        benefit_patterns = [
            r'(?:Sum Assured|Death Benefit|Coverage)\s*:?\s*\$?([\d,]+)',
            r'(?:Benefit|Coverage)\s+of\s+\$?([\d,]+)'
        ]
        
        for pattern in benefit_patterns:
            matches = re.finditer(pattern, content, re.IGNORECASE)
            for match in matches:
                benefits.append({
                    "amount": match.group(1).replace(',', ''),
                    "type": "monetary_benefit",
                    "context": match.group(0)
                })
        
        return benefits
    
    def _extract_simple_terms(self, content: str) -> List[Dict[str, Any]]:
        """Extract insurance terms."""
        terms = []
        insurance_terms = [
            "premium", "policyholder", "beneficiary", "rider", "exclusion",
            "deductible", "claim", "underwriting", "cash value"
        ]
        
        for term in insurance_terms:
            if term.lower() in content.lower():
                terms.append({
                    "name": term,
                    "found_in_context": True
                })
        
        return terms
    
    async def _create_policy_node(self, session, doc_id: str, policy: Dict[str, Any]):
        """Create a Policy node in Neo4j."""
        query = """
        MATCH (d:Document {doc_id: $doc_id})
        MERGE (p:Policy {policy_number: $policy_number})
        SET p.type = $type,
            p.context = $context
        MERGE (p)-[:DERIVED_FROM]->(d)
        """
        
        await session.run(query, {
            "doc_id": doc_id,
            "policy_number": policy.get("policy_number", "unknown"),
            "type": policy.get("type", "unknown"),
            "context": policy.get("context", "")
        })
    
    async def _create_benefit_node(self, session, doc_id: str, benefit: Dict[str, Any]):
        """Create a Benefit node in Neo4j."""
        query = """
        MATCH (d:Document {doc_id: $doc_id})
        MERGE (b:Benefit {benefit_id: $benefit_id})
        SET b.amount = $amount,
            b.type = $type,
            b.context = $context
        MERGE (b)-[:DERIVED_FROM]->(d)
        """
        
        benefit_id = f"{doc_id}_benefit_{len(benefit.get('context', ''))}"
        
        await session.run(query, {
            "doc_id": doc_id,
            "benefit_id": benefit_id,
            "amount": benefit.get("amount", "0"),
            "type": benefit.get("type", "unknown"),
            "context": benefit.get("context", "")
        })
    
    async def _create_term_node(self, session, doc_id: str, term: Dict[str, Any]):
        """Create a Term node in Neo4j."""
        query = """
        MATCH (d:Document {doc_id: $doc_id})
        MERGE (t:Term {name: $name})
        MERGE (t)-[:DEFINED_IN]->(d)
        """
        
        await session.run(query, {
            "doc_id": doc_id,
            "name": term.get("name", "unknown")
        })
    
    async def clear_graph(self):
        """Clear the knowledge graph."""
        if not self._initialized or not self.driver:
            logger.warning("Neo4j client not initialized, skipping graph clear")
            return
        
        try:
            async with self.driver.session() as session:
                # Delete all nodes and relationships
                await session.run("MATCH (n) DETACH DELETE n")
                logger.info("Cleared Neo4j graph")
        except Exception as e:
            logger.error(f"Failed to clear Neo4j graph: {e}")


class GraphBuilder:
    """Builds knowledge graph from document chunks using insurance ontology."""
    
    def __init__(self, ontology_path: Optional[str] = None):
        """Initialize graph builder with optional ontology."""
        self.graph_client = GraphitiClient()
        self._initialized = False
        self.ontology = None
        
        # Load ontology if path provided
        if ontology_path:
            self.load_ontology(ontology_path)
        else:
            # Try to load default ontology
            default_ontology_path = os.path.join(
                os.path.dirname(os.path.dirname(__file__)),
                "agent", "ontology", "insurance_ontology.yaml"
            )
            if os.path.exists(default_ontology_path):
                self.load_ontology(default_ontology_path)
    
    def load_ontology(self, ontology_path: str):
        """Load insurance ontology from YAML file."""
        try:
            with open(ontology_path, 'r', encoding='utf-8') as f:
                self.ontology = yaml.safe_load(f)
            logger.info(f"Loaded insurance ontology from {ontology_path}")
        except Exception as e:
            logger.warning(f"Failed to load ontology from {ontology_path}: {e}")
            self.ontology = None
    
    def get_entity_types(self) -> List[str]:
        """Get entity types from loaded ontology."""
        if self.ontology and 'entities' in self.ontology:
            return list(self.ontology['entities'].keys())
        return []
    
    def get_relation_types(self) -> List[str]:
        """Get relation types from loaded ontology."""
        if self.ontology and 'relations' in self.ontology:
            return list(self.ontology['relations'].keys())
        return []
    
    def get_ingestion_hints(self) -> Dict[str, Any]:
        """Get ingestion hints from ontology."""
        if self.ontology and 'ingestion_hints' in self.ontology:
            return self.ontology['ingestion_hints']
        return {}
    
    async def initialize(self):
        """Initialize graph client."""
        if not self._initialized:
            await self.graph_client.initialize()
            self._initialized = True
    
    async def close(self):
        """Close graph client."""
        if self._initialized:
            await self.graph_client.close()
            self._initialized = False
    
    async def add_document_to_graph(
        self,
        chunks: List[DocumentChunk],
        document_title: str,
        document_source: str,
        document_metadata: Optional[Dict[str, Any]] = None,
        batch_size: int = 3  # Reduced batch size for Graphiti
    ) -> Dict[str, Any]:
        """
        Add document chunks to the knowledge graph.
        
        Args:
            chunks: List of document chunks
            document_title: Title of the document
            document_source: Source of the document
            document_metadata: Additional metadata
            batch_size: Number of chunks to process in each batch
        
        Returns:
            Processing results
        """
        if not self._initialized:
            await self.initialize()
        
        if not chunks:
            return {"episodes_created": 0, "errors": []}
        
        logger.info(f"Adding {len(chunks)} chunks to knowledge graph for document: {document_title}")
        logger.info("⚠️ Large chunks will be truncated to avoid Graphiti token limits.")
        
        # Check for oversized chunks and warn
        oversized_chunks = [i for i, chunk in enumerate(chunks) if len(chunk.content) > 6000]
        if oversized_chunks:
            logger.warning(f"Found {len(oversized_chunks)} chunks over 6000 chars that will be truncated: {oversized_chunks}")
        
        episodes_created = 0
        errors = []
        
        # Process chunks one by one to avoid overwhelming Graphiti
        for i, chunk in enumerate(chunks):
            try:
                # Create episode ID
                episode_id = f"{document_source}_{chunk.index}_{datetime.now().timestamp()}"
                
                # Prepare episode content with size limits
                episode_content = self._prepare_episode_content(
                    chunk,
                    document_title,
                    document_metadata
                )
                
                # Create source description (shorter)
                source_description = f"Document: {document_title} (Chunk: {chunk.index})"
                
                # Add episode to graph
                await self.graph_client.add_episode(
                    episode_id=episode_id,
                    content=episode_content,
                    source=source_description,
                    timestamp=datetime.now(timezone.utc),
                    metadata={
                        "document_title": document_title,
                        "document_source": document_source,
                        "chunk_index": chunk.index,
                        "original_length": len(chunk.content),
                        "processed_length": len(episode_content)
                    }
                )
                
                episodes_created += 1
                logger.info(f"✓ Added episode {episode_id} to knowledge graph ({episodes_created}/{len(chunks)})")
                
                # Small delay between each episode to reduce API pressure
                if i < len(chunks) - 1:
                    await asyncio.sleep(0.5)
                    
            except Exception as e:
                error_msg = f"Failed to add chunk {chunk.index} to graph: {str(e)}"
                logger.error(error_msg)
                errors.append(error_msg)
                
                # Continue processing other chunks even if one fails
                continue
        
        result = {
            "episodes_created": episodes_created,
            "total_chunks": len(chunks),
            "errors": errors
        }
        
        logger.info(f"Graph building complete: {episodes_created} episodes created, {len(errors)} errors")
        return result
    
    def _prepare_episode_content(
        self,
        chunk: DocumentChunk,
        document_title: str,
        document_metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Prepare episode content optimized for insurance ontology.
        
        Args:
            chunk: Document chunk
            document_title: Title of the document
            document_metadata: Additional metadata
        
        Returns:
            Formatted episode content optimized for insurance domain
        """
        # Limit chunk content to avoid Graphiti's token limits
        max_content_length = 6000
        
        content = chunk.content
        if len(content) > max_content_length:
            # Truncate content but try to end at a sentence boundary
            truncated = content[:max_content_length]
            last_sentence_end = max(
                truncated.rfind('. '),
                truncated.rfind('! '),
                truncated.rfind('? ')
            )
            
            if last_sentence_end > max_content_length * 0.7:
                content = truncated[:last_sentence_end + 1] + " [TRUNCATED]"
            else:
                content = truncated + "... [TRUNCATED]"
            
            logger.warning(f"Truncated chunk {chunk.index} from {len(chunk.content)} to {len(content)} chars for Graphiti")
        
        # Prepare insurance-focused episode content
        episode_parts = []
        
        # Add document context
        episode_parts.append(f"[Document: {document_title}]")
        
        # Add document metadata if available
        if document_metadata:
            metadata_parts = []
            if "product_name" in document_metadata:
                metadata_parts.append(f"Product: {document_metadata['product_name']}")
            if "policy_type" in document_metadata:
                metadata_parts.append(f"Type: {document_metadata['policy_type']}")
            if "document_type" in document_metadata:
                metadata_parts.append(f"Document Type: {document_metadata['document_type']}")
            
            if metadata_parts:
                episode_parts.append(f"[{', '.join(metadata_parts)}]")
        
        # Add extracted entities summary if available
        entities = chunk.metadata.get('insurance_entities', {})
        if entities:
            entity_summary = []
            for entity_type, entity_list in entities.items():
                if entity_list and entity_type in ['policies', 'benefits', 'premiums', 'riders']:
                    count = len(entity_list)
                    if count > 0:
                        entity_summary.append(f"{entity_type}: {count}")
            
            if entity_summary:
                episode_parts.append(f"[Entities: {', '.join(entity_summary)}]")
        
        # Add the main content
        episode_parts.append("")  # Empty line separator
        episode_parts.append(content)
        
        episode_content = "\n".join(episode_parts)
        
        # Final length check
        if len(episode_content) > max_content_length + 200:  # Account for added metadata
            # If still too long, prioritize the main content
            metadata_header = episode_parts[0] if episode_parts else ""
            remaining_length = max_content_length - len(metadata_header) - 50
            if remaining_length > 0:
                episode_content = metadata_header + "\n\n" + content[:remaining_length] + "... [TRUNCATED]"
            else:
                episode_content = content[:max_content_length] + "... [TRUNCATED]"
        
        return episode_content
    
    def _estimate_tokens(self, text: str) -> int:
        """Rough estimate of token count (4 chars per token)."""
        return len(text) // 4
    
    def _is_content_too_large(self, content: str, max_tokens: int = 7000) -> bool:
        """Check if content is too large for Graphiti processing."""
        return self._estimate_tokens(content) > max_tokens
    
    async def extract_insurance_entities_from_chunks(
        self,
        chunks: List[DocumentChunk],
        extract_policies: bool = True,
        extract_benefits: bool = True,
        extract_riders: bool = True,
        extract_premiums: bool = True,
        extract_claims: bool = True
    ) -> List[DocumentChunk]:
        """
        Extract insurance entities from chunks and add to metadata based on ontology.
        
        Args:
            chunks: List of document chunks
            extract_policies: Whether to extract policy information
            extract_benefits: Whether to extract benefit information
            extract_riders: Whether to extract rider information
            extract_premiums: Whether to extract premium information
            extract_claims: Whether to extract claim information
        
        Returns:
            Chunks with insurance entity metadata added
        """
        logger.info(f"Extracting insurance entities from {len(chunks)} chunks")
        
        enriched_chunks = []
        
        for chunk in chunks:
            entities = {
                "policies": [],
                "benefits": [],
                "riders": [],
                "premiums": [],
                "claims": [],
                "exclusions": [],
                "conditions": [],
                "cash_values": [],
                "investment_options": [],
                "charges": [],
                "terms": []
            }
            
            content = chunk.content
            
            # Extract insurance entities based on ontology
            if extract_policies:
                entities["policies"] = self._extract_policies(content)
            
            if extract_benefits:
                entities["benefits"] = self._extract_benefits(content)
            
            if extract_riders:
                entities["riders"] = self._extract_riders(content)
            
            if extract_premiums:
                entities["premiums"] = self._extract_premiums(content)
            
            if extract_claims:
                entities["claims"] = self._extract_claims(content)
            
            # Extract other insurance entities
            entities["exclusions"] = self._extract_exclusions(content)
            entities["conditions"] = self._extract_conditions(content)
            entities["cash_values"] = self._extract_cash_values(content)
            entities["investment_options"] = self._extract_investment_options(content)
            entities["charges"] = self._extract_charges(content)
            entities["terms"] = self._extract_insurance_terms(content)
            
            # Apply ontology-based extraction hints
            if self.ontology:
                ontology_entities = self._apply_ontology_hints(content)
                # Merge ontology-derived entities
                for key, values in ontology_entities.items():
                    if key.replace("_", "") in entities:
                        entities[key.replace("_", "")].extend(values)
                    else:
                        entities[key] = values
            
            # Create enriched chunk
            enriched_chunk = DocumentChunk(
                content=chunk.content,
                index=chunk.index,
                start_char=chunk.start_char,
                end_char=chunk.end_char,
                metadata={
                    **chunk.metadata,
                    "insurance_entities": entities,
                    "entity_extraction_date": datetime.now().isoformat(),
                    "ontology_version": "1.0"
                },
                token_count=chunk.token_count
            )
            
            # Preserve embedding if it exists
            if hasattr(chunk, 'embedding'):
                enriched_chunk.embedding = chunk.embedding
            
            enriched_chunks.append(enriched_chunk)
        
        logger.info("Insurance entity extraction complete")
        return enriched_chunks
    def _apply_ontology_hints(self, text: str) -> Dict[str, List[Dict[str, Any]]]:
        """Apply ontology ingestion hints to extract entities."""
        extracted = {
            "derived_entities": [],
            "conditions": [],
            "exclusions": [],
            "benefits": [],
            "premiums": [],
            "cash_values": [],
            "charges": [],
            "rates": []
        }
        
        if not self.ontology:
            return extracted
        
        hints = self.get_ingestion_hints()
        derive_rules = hints.get('derive', [])
        
        text_lower = text.lower()
        
        # Apply derivation rules from ontology
        for rule in derive_rules:
            if isinstance(rule, str):
                # Parse rule format: "if text contains 'X' then create Y"
                if "if text contains" in rule and "then create" in rule:
                    parts = rule.split("then create")
                    if len(parts) == 2:
                        condition_part = parts[0].strip()
                        action_part = parts[1].strip()
                        
                        # Extract search terms
                        if "if text contains" in condition_part:
                            search_terms = re.findall(r'"([^"]*)"', condition_part)
                            if not search_terms:
                                search_terms = re.findall(r"'([^']*)'", condition_part)
                            
                            # Check if any search term matches
                            for term in search_terms:
                                if term.lower() in text_lower:
                                    # Extract entity type and properties from action
                                    if "Exclusion.category" in action_part:
                                        category = action_part.split("=")[-1].strip()
                                        extracted["exclusions"].append({
                                            "type": "exclusion_category",
                                            "value": category,
                                            "context": f"Found '{term}' indicating {category}",
                                            "ontology_rule": rule
                                        })
                                    
                                    elif "Condition.type" in action_part:
                                        condition_type = action_part.split("=")[-1].strip()
                                        extracted["conditions"].append({
                                            "type": "condition_type",
                                            "value": condition_type,
                                            "context": f"Found '{term}' indicating {condition_type}",
                                            "ontology_rule": rule
                                        })
                                    
                                    elif "Premium.is_flexible" in action_part:
                                        extracted["premiums"].append({
                                            "type": "flexible_premium",
                                            "value": True,
                                            "context": f"Found '{term}' indicating flexible premium",
                                            "ontology_rule": rule
                                        })
                                    
                                    elif "CashValue" in action_part:
                                        extracted["cash_values"].append({
                                            "type": "cash_value_indicator",
                                            "value": term,
                                            "context": f"Found '{term}' indicating cash value feature",
                                            "ontology_rule": rule
                                        })
                                    
                                    elif "PolicyCharge" in action_part:
                                        charge_type = "COI" if "COI" in action_part else "Surrender" if "Surrender" in action_part else "Unknown"
                                        extracted["charges"].append({
                                            "type": "charge_type",
                                            "value": charge_type,
                                            "context": f"Found '{term}' indicating {charge_type} charge",
                                            "ontology_rule": rule
                                        })
                                    
                                    elif "InterestRate" in action_part:
                                        rate_type = "Guaranteed" if "Guaranteed" in action_part else "Current" if "Current" in action_part else "Unknown"
                                        extracted["rates"].append({
                                            "type": "interest_rate_type",
                                            "value": rate_type,
                                            "context": f"Found '{term}' indicating {rate_type} rate",
                                            "ontology_rule": rule
                                        })
                
                # Parse capture rules for amounts and percentages
                elif "capture sums like" in rule:
                    if "$" in rule and "Benefit.sum_assured" in rule:
                        # Look for monetary amounts
                        money_patterns = [
                            r'\$[\d,]+(?:\.\d{2})?',
                            r'USD\s*[\d,]+(?:\.\d{2})?',
                            r'[\d,]+(?:\.\d{2})?\s*dollars?'
                        ]
                        
                        for pattern in money_patterns:
                            matches = re.finditer(pattern, text, re.IGNORECASE)
                            for match in matches:
                                extracted["benefits"].append({
                                    "type": "sum_assured",
                                    "value": match.group(0),
                                    "unit": "Currency",
                                    "context": f"Monetary amount: {match.group(0)}",
                                    "ontology_rule": rule
                                })
                
                elif "capture percents like" in rule:
                    if "%" in rule and "Benefit.unit=Percentage" in rule:
                        # Look for percentages
                        percent_patterns = [
                            r'\d+(?:\.\d+)?%',
                            r'\d+(?:\.\d+)?\s*percent'
                        ]
                        
                        for pattern in percent_patterns:
                            matches = re.finditer(pattern, text, re.IGNORECASE)
                            for match in matches:
                                extracted["benefits"].append({
                                    "type": "percentage_benefit",
                                    "value": match.group(0),
                                    "unit": "Percentage",
                                    "context": f"Percentage amount: {match.group(0)}",
                                    "ontology_rule": rule
                                })
        
        return extracted
    
    def _extract_policies(self, text: str) -> List[Dict[str, Any]]:
        """Extract policy information from text based on insurance ontology."""
        policies = []
        
        # Policy types from ontology
        policy_types = [
            "TermLife", "WholeLife", "UniversalLife", "VariableUL", "IndexedUL", 
            "ULIP", "Health", "CriticalIllness", "Accident"
        ]
        
        # Policy number patterns
        policy_number_patterns = [
            r'Policy\s+(?:Number|No\.?)\s*:?\s*([A-Z0-9\-/]+)',
            r'Contract\s+(?:Number|No\.?)\s*:?\s*([A-Z0-9\-/]+)',
            r'Certificate\s+(?:Number|No\.?)\s*:?\s*([A-Z0-9\-/]+)'
        ]
        
        for pattern in policy_number_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                policies.append({
                    "type": "policy_number",
                    "value": match.group(1),
                    "context": match.group(0)
                })
        
        # Policy types
        for policy_type in policy_types:
            pattern = r'\b' + re.escape(policy_type) + r'\b'
            if re.search(pattern, text, re.IGNORECASE):
                policies.append({
                    "type": "policy_type",
                    "value": policy_type,
                    "context": f"Found {policy_type} policy type"
                })
        
        # Death benefit options
        death_benefit_options = ["LevelA", "IncreasingB", "ReturnOfPremium", "Hybrid"]
        for option in death_benefit_options:
            if option.lower() in text.lower():
                policies.append({
                    "type": "death_benefit_option",
                    "value": option,
                    "context": f"Death benefit option: {option}"
                })
        
        return policies
    
    def _extract_benefits(self, text: str) -> List[Dict[str, Any]]:
        """Extract benefit information from text."""
        benefits = []
        
        # Benefit categories from ontology
        benefit_categories = [
            "Death", "TPD", "CI", "Hospitalization", "Surgical", "Accident", 
            "Waiver", "Maturity", "Survival", "CashBack", "Income"
        ]
        
        # Sum assured patterns
        sum_assured_patterns = [
            r'Sum\s+Assured\s*:?\s*\$?([\d,]+)',
            r'Coverage\s+Amount\s*:?\s*\$?([\d,]+)',
            r'Benefit\s+Amount\s*:?\s*\$?([\d,]+)',
            r'Death\s+Benefit\s*:?\s*\$?([\d,]+)'
        ]
        
        for pattern in sum_assured_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                benefits.append({
                    "type": "sum_assured",
                    "value": match.group(1).replace(',', ''),
                    "context": match.group(0)
                })
        
        # Benefit categories
        for category in benefit_categories:
            pattern = r'\b' + re.escape(category) + r'\s+(?:Benefit|Coverage|Protection)'
            if re.search(pattern, text, re.IGNORECASE):
                benefits.append({
                    "type": "benefit_category",
                    "value": category,
                    "context": f"{category} benefit identified"
                })
        
        # Waiting periods
        waiting_period_patterns = [
            r'Waiting\s+Period\s*:?\s*(\d+)\s*(days?|months?|years?)',
            r'(?:Pre-existing|Waiting)\s+Period\s+of\s+(\d+)\s*(days?|months?|years?)'
        ]
        
        for pattern in waiting_period_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                benefits.append({
                    "type": "waiting_period",
                    "value": f"{match.group(1)} {match.group(2)}",
                    "context": match.group(0)
                })
        
        return benefits
    
    def _extract_riders(self, text: str) -> List[Dict[str, Any]]:
        """Extract rider information from text."""
        riders = []
        
        # Common rider keywords
        rider_keywords = [
            "Rider", "Add-on", "Optional Benefit", "Supplementary Benefit",
            "Additional Coverage", "Accelerated Death Benefit", "Waiver of Premium",
            "Accidental Death", "Critical Illness Rider", "Income Rider"
        ]
        
        # Rider code patterns
        rider_code_patterns = [
            r'Rider\s+(?:Code|No\.?)\s*:?\s*([A-Z0-9\-/]+)',
            r'([A-Z]{2,4}\d{2,4})\s+(?:Rider|Add-on)',
            r'Option\s+([A-Z]\d*)'
        ]
        
        for pattern in rider_code_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                riders.append({
                    "type": "rider_code",
                    "value": match.group(1),
                    "context": match.group(0)
                })
        
        # Rider names
        for keyword in rider_keywords:
            if keyword.lower() in text.lower():
                riders.append({
                    "type": "rider_type",
                    "value": keyword,
                    "context": f"Found {keyword}"
                })
        
        return riders
    
    def _extract_premiums(self, text: str) -> List[Dict[str, Any]]:
        """Extract premium information from text."""
        premiums = []
        
        # Premium frequency from ontology
        frequencies = ["Single", "Monthly", "Quarterly", "SemiAnnual", "Annual", "Flexible"]
        
        # Premium amount patterns
        premium_patterns = [
            r'Premium\s*:?\s*\$?([\d,]+(?:\.\d{2})?)',
            r'Monthly\s+Premium\s*:?\s*\$?([\d,]+(?:\.\d{2})?)',
            r'Annual\s+Premium\s*:?\s*\$?([\d,]+(?:\.\d{2})?)',
            r'Target\s+Premium\s*:?\s*\$?([\d,]+(?:\.\d{2})?)',
            r'Minimum\s+Premium\s*:?\s*\$?([\d,]+(?:\.\d{2})?)'
        ]
        
        for pattern in premium_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                premiums.append({
                    "type": "premium_amount",
                    "value": match.group(1).replace(',', ''),
                    "context": match.group(0)
                })
        
        # Premium frequencies
        for frequency in frequencies:
            if frequency.lower() in text.lower():
                premiums.append({
                    "type": "premium_frequency",
                    "value": frequency,
                    "context": f"Premium frequency: {frequency}"
                })
        
        # Flexible premium indicators
        flexible_indicators = [
            "flexible premium", "variable premium", "adjustable premium",
            "skip payment", "premium holiday"
        ]
        
        for indicator in flexible_indicators:
            if indicator.lower() in text.lower():
                premiums.append({
                    "type": "flexible_premium",
                    "value": True,
                    "context": indicator
                })
        
        return premiums
    
    def _extract_claims(self, text: str) -> List[Dict[str, Any]]:
        """Extract claim information from text."""
        claims = []
        
        # Claim types from ontology
        claim_types = [
            "Death", "TPD", "CI", "Hospitalization", "Surgical", "Accident", 
            "Maturity", "Surrender", "Waiver"
        ]
        
        # Claim number patterns
        claim_patterns = [
            r'Claim\s+(?:Number|No\.?)\s*:?\s*([A-Z0-9\-/]+)',
            r'Claim\s+ID\s*:?\s*([A-Z0-9\-/]+)'
        ]
        
        for pattern in claim_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                claims.append({
                    "type": "claim_number",
                    "value": match.group(1),
                    "context": match.group(0)
                })
        
        # Claim types
        for claim_type in claim_types:
            pattern = r'\b' + re.escape(claim_type) + r'\s+Claim'
            if re.search(pattern, text, re.IGNORECASE):
                claims.append({
                    "type": "claim_type",
                    "value": claim_type,
                    "context": f"{claim_type} claim"
                })
        
        return claims
    
    def _extract_exclusions(self, text: str) -> List[Dict[str, Any]]:
        """Extract exclusion information from text."""
        exclusions = []
        
        # Exclusion categories from ontology
        exclusion_categories = [
            "PreExisting", "War", "Suicide", "SelfInflicted", "HazardousSports",
            "AlcoholDrugs", "Pregnancy", "Covid19"
        ]
        
        # Exclusion indicators
        exclusion_indicators = [
            "exclusion", "excluded", "not covered", "limitation",
            "pre-existing condition", "waiting period", "suicide clause"
        ]
        
        for indicator in exclusion_indicators:
            if indicator.lower() in text.lower():
                exclusions.append({
                    "type": "exclusion_indicator",
                    "value": indicator,
                    "context": f"Exclusion: {indicator}"
                })
        
        return exclusions
    
    def _extract_conditions(self, text: str) -> List[Dict[str, Any]]:
        """Extract condition information from text."""
        conditions = []
        
        # Condition types from ontology
        condition_types = [
            "Eligibility", "Underwriting", "Disclosure", "Reinstatement",
            "Loan", "Surrender", "Grace", "FreeLook", "Tax"
        ]
        
        # Common condition indicators
        condition_indicators = [
            "grace period", "free look", "cooling off", "eligibility",
            "underwriting", "disclosure", "reinstatement", "loan provision"
        ]
        
        for indicator in condition_indicators:
            if indicator.lower() in text.lower():
                conditions.append({
                    "type": "condition_indicator",
                    "value": indicator,
                    "context": f"Condition: {indicator}"
                })
        
        return conditions
    
    def _extract_cash_values(self, text: str) -> List[Dict[str, Any]]:
        """Extract cash value information from text."""
        cash_values = []
        
        # Cash value indicators
        cash_value_indicators = [
            "cash value", "account value", "surrender value",
            "guaranteed minimum rate", "current interest rate"
        ]
        
        # Cash value amount patterns
        cash_value_patterns = [
            r'Cash\s+Value\s*:?\s*\$?([\d,]+(?:\.\d{2})?)',
            r'Account\s+Value\s*:?\s*\$?([\d,]+(?:\.\d{2})?)',
            r'Surrender\s+Value\s*:?\s*\$?([\d,]+(?:\.\d{2})?)'
        ]
        
        for pattern in cash_value_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                cash_values.append({
                    "type": "cash_value_amount",
                    "value": match.group(1).replace(',', ''),
                    "context": match.group(0)
                })
        
        for indicator in cash_value_indicators:
            if indicator.lower() in text.lower():
                cash_values.append({
                    "type": "cash_value_feature",
                    "value": indicator,
                    "context": f"Cash value: {indicator}"
                })
        
        return cash_values
    
    def _extract_investment_options(self, text: str) -> List[Dict[str, Any]]:
        """Extract investment option information from text."""
        investment_options = []
        
        # Fund types from ontology
        fund_types = ["Equity", "Bond", "Balanced", "MoneyMarket", "Index", "Target"]
        
        # Investment indicators
        investment_indicators = [
            "investment option", "fund", "sub-account", "investment choice",
            "portfolio", "asset allocation"
        ]
        
        for fund_type in fund_types:
            pattern = r'\b' + re.escape(fund_type) + r'\s+Fund'
            if re.search(pattern, text, re.IGNORECASE):
                investment_options.append({
                    "type": "fund_type",
                    "value": fund_type,
                    "context": f"{fund_type} fund"
                })
        
        for indicator in investment_indicators:
            if indicator.lower() in text.lower():
                investment_options.append({
                    "type": "investment_feature",
                    "value": indicator,
                    "context": f"Investment: {indicator}"
                })
        
        return investment_options
    
    def _extract_charges(self, text: str) -> List[Dict[str, Any]]:
        """Extract charge information from text."""
        charges = []
        
        # Charge types from ontology
        charge_types = ["COI", "Administration", "Surrender", "RiderCharge", "PremiumLoad"]
        
        # Charge indicators
        charge_indicators = [
            "cost of insurance", "COI", "administration fee", "surrender charge",
            "premium load", "management fee", "rider charge"
        ]
        
        for charge_type in charge_types:
            if charge_type.lower() in text.lower():
                charges.append({
                    "type": "charge_type",
                    "value": charge_type,
                    "context": f"Charge type: {charge_type}"
                })
        
        for indicator in charge_indicators:
            if indicator.lower() in text.lower():
                charges.append({
                    "type": "charge_indicator",
                    "value": indicator,
                    "context": f"Charge: {indicator}"
                })
        
        return charges
    
    def _extract_insurance_terms(self, text: str) -> List[Dict[str, Any]]:
        """Extract insurance terminology from text."""
        terms = []
        
        # Common insurance terms
        insurance_terms = [
            "policyholder", "insured", "beneficiary", "underwriting",
            "actuarial", "mortality table", "lapse", "reinstatement",
            "annuity", "endowment", "maturity", "vesting", "surrender",
            "convertibility", "renewability", "contestability"
        ]
        
        for term in insurance_terms:
            if term.lower() in text.lower():
                terms.append({
                    "type": "insurance_term",
                    "value": term,
                    "context": f"Insurance term: {term}"
                })
        
        return terms
    
    async def clear_graph(self):
        """Clear all data from the knowledge graph."""
        if not self._initialized:
            await self.initialize()
        
        logger.warning("Clearing knowledge graph...")
        await self.graph_client.clear_graph()
        logger.info("Knowledge graph cleared")


class InsuranceEntityExtractor:
    """Insurance-focused rule-based entity extractor based on ontology."""
    
    def __init__(self):
        """Initialize extractor with insurance patterns."""
        # Policy patterns
        self.policy_patterns = [
            r'Policy\s+(?:Number|No\.?)\s*:?\s*([A-Z0-9\-/]+)',
            r'\b(?:TermLife|WholeLife|UniversalLife|VariableUL|IndexedUL|ULIP)\b',
            r'\b(?:Health|CriticalIllness|Accident)\s+(?:Policy|Insurance)\b'
        ]
        
        # Benefit patterns
        self.benefit_patterns = [
            r'Sum\s+Assured\s*:?\s*\$?([\d,]+)',
            r'\b(?:Death|TPD|CI|Hospitalization|Surgical)\s+Benefit\b',
            r'Coverage\s+Amount\s*:?\s*\$?([\d,]+)'
        ]
        
        # Premium patterns
        self.premium_patterns = [
            r'Premium\s*:?\s*\$?([\d,]+(?:\.\d{2})?)',
            r'\b(?:Monthly|Quarterly|Annual|Single)\s+Premium\b',
            r'Flexible\s+Premium'
        ]
        
        # Universal Life specific patterns
        self.ul_patterns = [
            r'Cash\s+Value\s*:?\s*\$?([\d,]+)',
            r'Cost\s+of\s+Insurance|COI',
            r'Surrender\s+Charge',
            r'Death\s+Benefit\s+Option',
            r'Investment\s+Option'
        ]
        
        # Exclusion patterns
        self.exclusion_patterns = [
            r'Exclusion|Excluded|Not\s+Covered',
            r'Pre-existing\s+Condition',
            r'Waiting\s+Period',
            r'Suicide\s+Clause'
        ]
    
    def extract_insurance_entities(self, text: str) -> Dict[str, List[Dict[str, Any]]]:
        """Extract insurance entities using patterns."""
        entities = {
            "policies": [],
            "benefits": [],
            "premiums": [],
            "universal_life": [],
            "exclusions": []
        }
        
        # Extract policies
        for pattern in self.policy_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                entities["policies"].append({
                    "type": "policy",
                    "value": match.group(0),
                    "position": match.span()
                })
        
        # Extract benefits
        for pattern in self.benefit_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                entities["benefits"].append({
                    "type": "benefit",
                    "value": match.group(0),
                    "position": match.span()
                })
        
        # Extract premiums
        for pattern in self.premium_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                entities["premiums"].append({
                    "type": "premium",
                    "value": match.group(0),
                    "position": match.span()
                })
        
        # Extract Universal Life features
        for pattern in self.ul_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                entities["universal_life"].append({
                    "type": "universal_life_feature",
                    "value": match.group(0),
                    "position": match.span()
                })
        
        # Extract exclusions
        for pattern in self.exclusion_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                entities["exclusions"].append({
                    "type": "exclusion",
                    "value": match.group(0),
                    "position": match.span()
                })
        
        # Remove duplicates and clean up
        for entity_type in entities:
            seen = set()
            unique_entities = []
            for entity in entities[entity_type]:
                key = (entity["value"].lower(), entity["position"])
                if key not in seen:
                    seen.add(key)
                    unique_entities.append(entity)
            entities[entity_type] = unique_entities
        
        return entities


# Factory function
def create_graph_builder(ontology_path: Optional[str] = None) -> GraphBuilder:
    """Create graph builder instance with optional ontology."""
    return GraphBuilder(ontology_path=ontology_path)


# Example usage
async def main():
    """Example usage of the insurance graph builder."""
    from .chunker import ChunkingConfig, create_chunker
    
    # Create chunker and graph builder
    config = ChunkingConfig(chunk_size=300, use_semantic_splitting=False)
    chunker = create_chunker(config)
    graph_builder = create_graph_builder()
    
    sample_insurance_text = """
    The PruMax Universal Life policy (Policy Number: UL123456789) offers flexible 
    premiums and a guaranteed minimum death benefit of $100,000. The policy includes 
    a cash value account that earns current interest rates, currently set at 3.5% annually.
    
    Key Benefits:
    - Death Benefit: Level A option with minimum $50,000
    - Critical Illness Rider: Coverage up to $25,000
    - Waiver of Premium Benefit in case of total and permanent disability
    - Flexible Premium: Monthly premiums from $200 to $2,000
    
    Investment Options:
    - Conservative Fund: Low-risk government bonds
    - Balanced Fund: Mix of equity and fixed income
    - Aggressive Growth Fund: High-risk equity investments
    
    Policy Charges:
    - Cost of Insurance (COI): Age-based monthly charges
    - Administration Fee: $5 monthly
    - Surrender Charges: Applicable for first 10 years
    
    Exclusions:
    - Pre-existing medical conditions (12-month waiting period)
    - Suicide within first 2 years
    - War and acts of terrorism
    - Hazardous sports and activities
    
    This Universal Life policy allows policy loans up to 90% of cash value
    and partial withdrawals after the first policy year.
    """
    
    # Chunk the document
    chunks = chunker.chunk_document(
        content=sample_insurance_text,
        title="PruMax Universal Life Policy Guide",
        source="prumax_policy.pdf"
    )
    
    print(f"Created {len(chunks)} chunks")
    
    # Extract insurance entities
    enriched_chunks = await graph_builder.extract_insurance_entities_from_chunks(chunks)
    
    for i, chunk in enumerate(enriched_chunks):
        entities = chunk.metadata.get('insurance_entities', {})
        print(f"\nChunk {i} Insurance Entities:")
        for entity_type, entity_list in entities.items():
            if entity_list:
                print(f"  {entity_type}: {len(entity_list)} items")
                for entity in entity_list[:3]:  # Show first 3 items
                    print(f"    - {entity.get('type', 'N/A')}: {entity.get('value', 'N/A')}")
    
    # Add to knowledge graph
    try:
        result = await graph_builder.add_document_to_graph(
            chunks=enriched_chunks,
            document_title="PruMax Universal Life Policy Guide",
            document_source="prumax_policy.pdf",
            document_metadata={
                "document_type": "policy_guide",
                "product_name": "PruMax",
                "policy_type": "UniversalLife",
                "version": "2024.1"
            }
        )
        
        print(f"\nGraph building result: {result}")
        
    except Exception as e:
        print(f"Graph building failed: {e}")
    
    finally:
        await graph_builder.close()


# Demonstration of Insurance Entity Extractor
def demo_insurance_extractor():
    """Demonstrate the insurance entity extractor."""
    extractor = InsuranceEntityExtractor()
    
    sample_text = """
    Policy Number: UL123456789
    Product: PruMax Universal Life Insurance
    Sum Assured: $150,000
    Monthly Premium: $250.00
    Cash Value: $15,000
    Cost of Insurance: $45/month
    Death Benefit Option: Level A
    Exclusions: Pre-existing conditions, suicide clause
    """
    
    entities = extractor.extract_insurance_entities(sample_text)
    
    print("Insurance Entity Extraction Demo:")
    for entity_type, entity_list in entities.items():
        if entity_list:
            print(f"\n{entity_type.title()}:")
            for entity in entity_list:
                print(f"  - {entity['value']} (Type: {entity['type']})")


if __name__ == "__main__":
    # Run entity extraction demo
    print("=" * 50)
    demo_insurance_extractor()
    print("\n" + "=" * 50)
    
    # Run full example
    asyncio.run(main())