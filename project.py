

import io

import json

import os

import re

from datetime import datetime

from pathlib import Path

from typing import TypedDict, Annotated

from xml.sax.saxutils import escape

import streamlit as st

from dotenv import load_dotenv

from pydantic import BaseModel, Field

from langchain_core.messages import (

    SystemMessage,

    HumanMessage,

    ToolMessage,

)

from langchain_openai import ChatOpenAI

from langchain_groq import ChatGroq

from langchain_tavily import TavilySearch

from langgraph.graph import StateGraph, START, END

from langgraph.graph.message import add_messages

from langgraph.prebuilt import ToolNode

# =========================================================

# 1. CONFIGURATION

# =========================================================

load_dotenv()

DATA_DIR = Path("data")

DATA_DIR.mkdir(exist_ok=True)

PROFILE_FILE = DATA_DIR / "career_profile.json"

HISTORY_FILE = DATA_DIR / "post_history.json"

WRITER_MODEL = "openai/gpt-oss-120b"

REVIEWER_MODEL = "openai/gpt-oss-120b"

# =========================================================

# 2. STRUCTURED OUTPUT SCHEMAS

# =========================================================

class QualityScorecard(BaseModel):

    hook: int = Field(ge=1, le=10)

    clarity: int = Field(ge=1, le=10)

    audience_fit: int = Field(ge=1, le=10)

    authenticity: int = Field(ge=1, le=10)

    readability: int = Field(ge=1, le=10)

    structure: int = Field(ge=1, le=10)

    feedback: str

    verdict: str

class ClaimCheck(BaseModel):

    claim: str

    status: str

    explanation: str

    source_urls: list[str] = Field(default_factory=list)

class ReviewResult(BaseModel):

    verdict: str

    feedback: str

    scorecard: QualityScorecard

    claim_checks: list[ClaimCheck] = Field(default_factory=list)

# =========================================================

# 3. LLMs AND TOOLS

# =========================================================

search_tool = TavilySearch(max_results=5)

tools = [search_tool]

writer_llm = ChatGroq(

    model=WRITER_MODEL,

    temperature=0.7,

)

writer_with_tools = writer_llm.bind_tools(tools)

reviewer_llm = ChatGroq(

    model=REVIEWER_MODEL,

    temperature=0.1,

)

# =========================================================

# 4. LANGGRAPH STATE

# =========================================================

class State(TypedDict, total=False):

    request: str

    tone: str

    audience: str

    career_profile: str

    messages: Annotated[list, add_messages]

    draft: str

    review_feedback: str

    is_approved: bool

    attempt: int

    scorecard: dict

    claim_checks: list[dict]

    events: list[dict]

# =========================================================

# 5. WRITER SYSTEM PROMPT

# =========================================================

WRITER_PROMPT = """

You are an expert LinkedIn content strategist and writer.

Handle all reasonable LinkedIn-related requests, including:

- Personal achievements and learning journeys

- Project showcases and technical posts

- Internship, job, and certification announcements

- AI, ML, GenAI, and technology explainers

- Industry trends and thought leadership

- Career advice and professional storytelling

- LinkedIn comments and replies

- Connection requests and professional messages

- Headlines, About sections, and profile summaries

- Event announcements and hackathon updates

- Rewriting, proofreading, and content improvement

USER INTENT:

Understand the requested format, purpose, tone, audience,

language, and length. Follow explicit instructions.

PERSONALIZATION:

Use the supplied career profile only when relevant.

Write in first person when appropriate.

Never invent personal achievements, employers, certificates,

metrics, dates, job offers, or project results.

Do not convert an aspiration into a completed achievement.

If information is missing, omit it or phrase conservatively.

WRITING QUALITY:

For a standard LinkedIn post, aim for 150-200 words unless

the user requests a different length.

Use a compelling opening, short paragraphs, and a clear idea.

Adapt the structure to the requested content type.

Do not force a question, CTA, emojis, or hashtags into every

piece of content.

Return the deliverable itself without unnecessary preamble.

WEB RESEARCH:

Use Tavily when the request requires current news, trends,

statistics, or external facts.

Do not search unnecessarily for personal stories.

Do not invent facts, citations, or source URLs.

REVISION:

When reviewer feedback is provided, address the issues while

preserving the user's original intent and supplied facts.

"""

# =========================================================

# 6. REVIEWER SYSTEM PROMPT

# =========================================================

REVIEWER_PROMPT = """

You are a strict but fair LinkedIn content reviewer and

claim-verification assistant.

Evaluate the draft against the original request, selected tone,

target audience, and user career profile.

QUALITY CRITERIA:

1\. Hook strength, when relevant to the format

2\. Clarity and usefulness

3\. Audience relevance

4\. Authenticity and factual consistency

5\. Readability

6\. Appropriate structure and length

7\. Compliance with the user's instructions

Adapt your evaluation to the content type. A short comment

or headline should not be rejected for being under 150 words.

CLAIM VERIFICATION:

- Claims about personal achievements are USER-PROVIDED when

  they originate from the user's input/profile. Do not claim

  independent verification without evidence.

- External factual claims should be checked against available

  research results included in the prompt.

- SUPPORTED means the provided evidence appears to support

  the claim.

- UNSUPPORTED means the available evidence does not support

  the claim or contradicts it.

- USER-PROVIDED means a personal claim came from the user

  and has not been independently verified.

- Do not invent source URLs.

- If no material claims exist, return an empty claim_checks list.

- Do not treat a claim as false merely because evidence is absent.

Return valid JSON only, using exactly this structure:

{

  "verdict": "APPROVED or REJECTED",

  "feedback": "Short actionable feedback",

  "scorecard": {

    "hook": 1,

    "clarity": 1,

    "audience_fit": 1,

    "authenticity": 1,

    "readability": 1,

    "structure": 1,

    "feedback": "Short explanation",

    "verdict": "APPROVED or REJECTED"

  },

  "claim_checks": [

    {

      "claim": "Claim being checked",

      "status": "SUPPORTED, UNSUPPORTED, or USER-PROVIDED",

      "explanation": "Reason for the status",

      "source_urls": []

    }

  ]

}

All scores must be integers from 1 to 10.

Approve only when the content fulfills the request and is

reasonably ready for human review before publication.

"""

# =========================================================

# 7. WORKFLOW EVENT HELPER

# =========================================================

def add_event(state, node, status, detail):

    events = list(state.get("events", []))

    events.append({

        "node": node,

        "status": status,

        "detail": detail,

        "time": datetime.now().strftime("%H:%M:%S"),

    })

    return events

def content_to_text(content):

    if isinstance(content, str):

        return content

    if isinstance(content, list):

        result = []

        for item in content:

            if isinstance(item, dict) and item.get("type") == "text":

                result.append(item.get("text", ""))

            else:

                result.append(str(item))

        return "\n".join(result)

    return str(content)

# =========================================================

# 8. WRITER NODE

# =========================================================

def writer_node(state: State) -> dict:

    messages = state.get("messages", [])

    attempt = state.get("attempt", 0)

    # Continue the same generation after a tool result.

    if messages and isinstance(messages[-1], ToolMessage):

        response = writer_with_tools.invoke([

            SystemMessage(content=WRITER_PROMPT),

            *messages,

        ])

        completed = not bool(

            getattr(response, "tool_calls", None)

        )

        return {

            "messages": [response],

            "attempt": attempt + int(completed),

            "events": add_event(

                state,

                "Writer Agent",

                "Completed" if completed else "Research requested",

                "Writer continued after web research.",

            ),

        }

    profile = state.get("career_profile", "")

    feedback = state.get("review_feedback", "")

    prompt = f"""

USER REQUEST:

{state['request']}

SELECTED TONE:

{state['tone']}

TARGET AUDIENCE:

{state['audience']}

USER CAREER PROFILE:

{profile if profile else "No career profile supplied."}

REVIEWER FEEDBACK:

{feedback if feedback else "This is the initial draft."}

Write the requested LinkedIn deliverable. Respect the user's

facts and intent. Use web search if current external facts

are needed. Return the deliverable directly.

"""

    response = writer_with_tools.invoke([

        SystemMessage(content=WRITER_PROMPT),

        HumanMessage(content=prompt),

    ])

    completed = not bool(

        getattr(response, "tool_calls", None)

    )

    return {

        "messages": [

            HumanMessage(content=prompt),

            response,

        ],

        "attempt": attempt + int(completed),

        "events": add_event(

            state,

            "Writer Agent",

            "Completed" if completed else "Research requested",

            "Created a draft or requested web research.",

        ),

    }

# =========================================================

# 9. DRAFT EXTRACTION NODE

# =========================================================

def extract_draft_node(state: State) -> dict:

    draft = content_to_text(state["messages"][-1].content)

    return {

        "draft": draft,

        "events": add_event(

            state,

            "Draft Extraction",

            "Completed",

            "Captured the writer's final text for review.",

        ),

    }

# =========================================================

# 10. REVIEWER AND CLAIM AUDITOR NODE

# =========================================================

def reviewer_node(state: State) -> dict:

    # Include search results so the reviewer can inspect evidence.

    research_messages = []

    for message in state.get("messages", []):

        if isinstance(message, ToolMessage):

            research_messages.append(

                content_to_text(message.content)[:12000]

            )

    research_context = (

        "\n\n".join(research_messages)

        if research_messages

        else "No web search results were collected."

    )

    prompt = f"""

ORIGINAL REQUEST:

{state['request']}

TONE:

{state['tone']}

TARGET AUDIENCE:

{state['audience']}

USER CAREER PROFILE:

{state.get('career_profile', '') or 'Not supplied.'}

DRAFT:

{state.get('draft', '')}

AVAILABLE WEB RESEARCH RESULTS:

{research_context}

Review the draft and return the required JSON.

"""

    response = reviewer_llm.invoke([

        SystemMessage(content=REVIEWER_PROMPT),

        HumanMessage(content=prompt),

    ])

    raw_text = content_to_text(response.content).strip()

    # Handle JSON enclosed in markdown code fences.

    raw_text = re.sub(

        r"^```(?:json)?\s*|\s*```$",

        "",

        raw_text,

        flags=re.IGNORECASE,

    )

    try:

        data = json.loads(raw_text)

    except json.JSONDecodeError:

        data = {

            "verdict": "REJECTED",

            "feedback": (

                "The reviewer returned invalid JSON. "

                "Inspect the response and try again."

            ),

            "scorecard": {

                "hook": 5,

                "clarity": 5,

                "audience_fit": 5,

                "authenticity": 5,

                "readability": 5,

                "structure": 5,

                "feedback": "Scorecard parsing failed; scores are placeholders.",

                "verdict": "REJECTED",

            },

            "claim_checks": [],

        }

    scorecard = data.get("scorecard", {})

    verdict = str(data.get("verdict", "REJECTED")).upper()

    approved = verdict == "APPROVED"

    feedback = data.get("feedback", "No feedback returned.")

    return {

        "review_feedback": feedback,

        "is_approved": approved,

        "scorecard": scorecard,

        "claim_checks": data.get("claim_checks", []),

        "events": add_event(

            state,

            "Reviewer & Claim Auditor",

            "Approved" if approved else "Rejected",

            feedback,

        ),

    }

# =========================================================

# 11. CONDITIONAL ROUTING

# =========================================================

def route_writer(state: State):

    last_message = state["messages"][-1]

    if getattr(last_message, "tool_calls", None):

        return "tools"

    return "extract_draft"

def route_reviewer(state: State):

    if state.get("is_approved", False):

        return END

    if state.get("attempt", 0) >= 3:

        return END

    return "writer"

# =========================================================

# 12. BUILD LANGGRAPH

# =========================================================

builder = StateGraph(State)

builder.add_node("writer", writer_node)

builder.add_node("tools", ToolNode(tools))

builder.add_node("extract_draft", extract_draft_node)

builder.add_node("reviewer", reviewer_node)

builder.add_edge(START, "writer")

builder.add_conditional_edges(

    "writer",

    route_writer,

)

# Tool output returns to the writer before review.

builder.add_edge("tools", "writer")

builder.add_edge("extract_draft", "reviewer")

builder.add_conditional_edges(

    "reviewer",

    route_reviewer,

)

app = builder.compile()

# =========================================================

# 13. GENERATION FUNCTION WITH LIVE EVENTS

# =========================================================

def run_generation(
    request,
    tone,
    audience,
    career_profile,
    progress_callback=None,
):
    initial_state = {
        "request": request,
        "tone": tone,
        "audience": audience,
        "career_profile": career_profile,
        "messages": [],
        "draft": "",
        "review_feedback": "",
        "is_approved": False,
        "attempt": 0,
        "scorecard": {},
        "claim_checks": [],
        "events": [],
    }

    # Stream node updates so the Streamlit dashboard changes during execution.
    result = dict(initial_state)
    result["messages"] = []
    result["events"] = []
    node_labels = {
        "writer": "Writer Agent",
        "tools": "Tavily Research",
        "extract_draft": "Draft Preview",
        "reviewer": "Reviewer & Claim Auditor",
    }

    for update in app.stream(
        initial_state,
        config={"recursion_limit": 50},
        stream_mode="updates",
    ):
        for node_name, node_output in update.items():
            node_output = node_output or {}

            if "messages" in node_output:
                result["messages"].extend(node_output["messages"])

            for key, value in node_output.items():
                if key != "messages":
                    result[key] = value

            label = node_labels.get(node_name, node_name.replace("_", " ").title())
            if node_name == "writer":
                status_detail = (
                    "Writer requested a research tool."
                    if result["messages"]
                    and getattr(result["messages"][-1], "tool_calls", None)
                    else "Draft text generated."
                )
            elif node_name == "tools":
                status_detail = "Tavily returned research results."
            elif node_name == "extract_draft":
                status_detail = "Draft is ready for the reviewer."
            elif node_name == "reviewer":
                status_detail = result.get("review_feedback", "Review completed.")
            else:
                status_detail = "Node completed."

            event = {
                "node": label,
                "status": (
                    ("Approved" if result.get("is_approved") else "Rejected")
                    if node_name == "reviewer" else "Completed"
                ),
                "detail": status_detail,
                "draft": result.get("draft", ""),
                "review_feedback": result.get("review_feedback", ""),
                "is_approved": result.get("is_approved", False),
                "attempt": result.get("attempt", 0),
            }

            if node_name == "tools":
                tool_messages = [
                    message for message in result["messages"]
                    if isinstance(message, ToolMessage)
                ]
                event["research_results"] = [
                    content_to_text(message.content)[:12000]
                    for message in tool_messages[-1:]
                ]

            if progress_callback:
                progress_callback(event)

    return result


# 14. LOCAL DATA HELPERS

# =========================================================

def read_json(path, default):

    try:

        return json.loads(path.read_text(encoding="utf-8"))

    except (FileNotFoundError, json.JSONDecodeError):

        return default

def write_json(path, value):

    path.write_text(

        json.dumps(value, ensure_ascii=False, indent=2),

        encoding="utf-8",

    )

# =========================================================

# 15. PDF EXPORT

# =========================================================

def make_pdf(text):

    from reportlab.lib.pagesizes import letter

    from reportlab.lib.styles import getSampleStyleSheet

    from reportlab.platypus import (

        SimpleDocTemplate,

        Paragraph,

        Spacer,

    )

    from reportlab.lib.units import inch

    buffer = io.BytesIO()

    document = SimpleDocTemplate(

        buffer,

        pagesize=letter,

        rightMargin=0.7 * inch,

        leftMargin=0.7 * inch,

        topMargin=0.7 * inch,

        bottomMargin=0.7 * inch,

    )

    styles = getSampleStyleSheet()

    story = []

    for paragraph in text.split("\n"):

        if paragraph.strip():

            story.append(

                Paragraph(

                    escape(paragraph),

                    styles["BodyText"],

                )

            )

        else:

            story.append(Spacer(1, 8))

    document.build(story)

    return buffer.getvalue()

# =========================================================

# 16. STREAMLIT DASHBOARD

# =========================================================

st.set_page_config(

    page_title="LinkedIn Content Copilot",

    page_icon="✍️",

    layout="wide",

)

st.title("LinkedIn Content Copilot")

st.caption(

    "Multi-agent writing · Career memory · Claim audit · "

    "Quality scorecard · History · Export"

)

profile = read_json(PROFILE_FILE, {})

history = read_json(HISTORY_FILE, [])

# ---------------------------------------------------------

# SIDEBAR: CAREER MEMORY

# ---------------------------------------------------------

with st.sidebar:

    st.header("Career Memory")

    st.caption(

        "Profile details are saved locally and used to "

        "personalize relevant posts."

    )

    name = st.text_input(

        "Name (optional)",

        value=profile.get("name", ""),

    )

    role = st.text_input(

        "Current role / education",

        value=profile.get("role", ""),

    )

    skills = st.text_area(

        "Skills",

        value=profile.get("skills", ""),

        placeholder="Python, LangGraph, ML...",

    )

    projects = st.text_area(

        "Projects and achievements",

        value=profile.get("projects", ""),

        placeholder="Describe what you actually built.",

    )

    experience = st.text_area(

        "Internships and certifications",

        value=profile.get("experience", ""),

    )

    if st.button("Save Career Memory", use_container_width=True):

        write_json(PROFILE_FILE, {

            "name": name,

            "role": role,

            "skills": skills,

            "projects": projects,

            "experience": experience,

        })

        st.success("Career profile saved.")

    career_profile = "\n".join([

        f"Name: {name}" if name else "",

        f"Role: {role}" if role else "",

        f"Skills: {skills}" if skills else "",

        f"Projects: {projects}" if projects else "",

        f"Experience: {experience}" if experience else "",

    ]).strip()

# ---------------------------------------------------------

# TABS

# ---------------------------------------------------------

tab_create, tab_history, tab_profile = st.tabs([

    "Create Content",

    "Post History",

    "Career Profile",

])

# =========================================================

# TAB 1: CREATE CONTENT

# =========================================================

with tab_create:

    request = st.text_area(

        "What would you like to create?",

        height=130,

        placeholder=(

            "Example: I completed LangGraph and built a "

            "multi-agent AI project using Python. Write a "

            "professional post about my learning journey."

        ),

    )

    col1, col2 = st.columns(2)

    with col1:

        tone = st.selectbox(

            "Choose the writing tone",

            [

                "Professional and authentic",

                "Conversational and friendly",

                "Confident and thought-leadership",

                "Storytelling and reflective",

                "Technical and educational",

                "Inspirational but not exaggerated",

                "Concise and direct",

                "Formal and corporate",

                "Humorous but professional",

                "Custom (describe in prompt)",

            ],

        )

    with col2:

        audience = st.selectbox(

            "Who is this content for?",

            [

                "General LinkedIn audience",

                "Recruiters and talent acquisition",

                "Founders and startup leaders",

                "Hiring managers",

                "AI/ML engineers and developers",

                "Students and early-career professionals",

                "Industry leaders and executives",

                "Potential clients and customers",

                "Investors",

                "Colleagues and professional network",

                "Custom (describe in prompt)",

            ],

        )

    generate = st.button(

        "Generate and Review",

        type="primary",

        disabled=not request.strip(),

    )

    if generate:

        if not os.getenv("GROQ_API_KEY"):

            st.error("GROQ_API_KEY is missing from your .env file.")

        elif not os.getenv("GROQ_API_KEY"):

            st.error("GROQ_API_KEY is missing from your .env file.")

        else:

            event_area = st.empty()
            draft_area = st.empty()
            review_area = st.empty()
            research_area = st.empty()
            progress = st.progress(0, text="Accepting prompt...")
            event_log = []
            workflow_steps = [
                "Accepting prompt",
                "Writer Agent",
                "Tavily Research",
                "Draft Preview",
                "Reviewer & Claim Auditor",
                "Final Approval",
            ]
            completed_nodes = set()

            def render_workflow(active_node=None):
                with event_area.container():
                    st.markdown("### Live Workflow")
                    for step in workflow_steps:
                        if step == "Accepting prompt" or step in completed_nodes:
                            st.success(f"✓ {step} — Completed")
                        elif step == active_node:
                            st.info(f"● {step} — Running")
                        else:
                            st.caption(f"○ {step} — Waiting")

            render_workflow(active_node="Writer Agent")

            def display_event(event):
                node = event.get("node", "Agent")
                completed_nodes.add(node)
                event_log.append(event)
                progress.progress(
                    min(0.95, len(completed_nodes) / len(workflow_steps)),
                    text=f"Completed: {node}",
                )
                if node == "Writer Agent":
                    next_node = (
                        "Tavily Research"
                        if "requested a research tool" in event.get("detail", "").lower()
                        else "Draft Preview"
                    )
                else:
                    next_node = {
                        "Tavily Research": "Writer Agent",
                        "Draft Preview": "Reviewer & Claim Auditor",
                        "Reviewer & Claim Auditor": "Final Approval",
                    }.get(node)
                render_workflow(active_node=next_node)

                with event_area.container():
                    st.markdown("### Live Workflow Activity")
                    for item in event_log:
                        st.write(
                            f"**{item.get('node', 'Agent')}** · "
                            f"{item.get('status', 'Completed')}"
                        )
                        if item.get("detail"):
                            st.caption(item["detail"])

                if event.get("draft"):
                    with draft_area.container():
                        st.markdown("### Draft Preview")
                        st.markdown(event["draft"])

                if event.get("review_feedback"):
                    with review_area.container():
                        st.markdown("### Reviewer Feedback")
                        st.info(event["review_feedback"])

                if event.get("research_results"):
                    with research_area.container():
                        st.markdown("### Tavily Research Results")
                        for research in event["research_results"]:
                            st.text(research[:12000])

            try:

                result = run_generation(

                    request=request.strip(),

                    tone=tone,

                    audience=audience,

                    career_profile=career_profile,

                    progress_callback=display_event,

                )

                completed_nodes.add("Final Approval")
                render_workflow()
                progress.progress(1.0, text="Workflow completed.")
                st.session_state["last_generation_result"] = result
                st.session_state["last_generation_request"] = request.strip()
                st.session_state["last_generation_tone"] = tone
                st.session_state["last_generation_audience"] = audience

            except Exception as error:

                st.error(f"Generation failed: {error}")

                st.info(

                    "Check API keys, model access, package versions, "

                    "and network connectivity."

                )

                st.stop()

            draft = result.get("draft", "")

            approved = result.get("is_approved", False)

            scorecard = result.get("scorecard", {})

            claims = result.get("claim_checks", [])

            st.divider()

            st.subheader("Final LinkedIn Content")

            if approved:

                st.success("Reviewer approved the draft.")

            else:

                st.warning(

                    "The reviewer did not approve the draft within "

                    "the available attempts. Review it before publishing."

                )

            edited_draft = st.text_area(

                "Review or edit the final draft",

                value=draft,

                height=280,

                key="editable_draft",

            )

            scores = [

                scorecard.get(key)

                for key in [

                    "hook",

                    "clarity",

                    "audience_fit",

                    "authenticity",

                    "readability",

                    "structure",

                ]

                if isinstance(scorecard.get(key), (int, float))

            ]

            metric1, metric2, metric3 = st.columns(3)

            metric1.metric(

                "Completed drafts",

                result.get("attempt", 0),

            )

            metric2.metric(

                "Reviewer status",

                "Approved" if approved else "Needs review",

            )

            metric3.metric(

                "Average quality score",

                f"{sum(scores) / len(scores):.1f}/10"

                if scores else "N/A",

            )

            # -------------------------------------------------

            # QUALITY SCORECARD

            # -------------------------------------------------

            st.subheader("Quality Scorecard")

            labels = {

                "hook": "Hook strength",

                "clarity": "Clarity",

                "audience_fit": "Audience fit",

                "authenticity": "Authenticity",

                "readability": "Readability",

                "structure": "Structure",

            }

            score_columns = st.columns(3)

            for index, (key, label) in enumerate(labels.items()):

                value = scorecard.get(key)

                with score_columns[index % 3]:

                    if isinstance(value, (int, float)):

                        st.metric(label, f"{value}/10")

                        st.progress(

                            max(0.0, min(1.0, value / 10))

                        )

            if scorecard.get("feedback"):

                st.info(scorecard["feedback"])

            # -------------------------------------------------

            # CLAIM VERIFICATION

            # -------------------------------------------------

            st.subheader("Claim Verification")

            if claims:

                for index, claim in enumerate(claims, start=1):

                    status = str(

                        claim.get("status", "UNKNOWN")

                    ).upper()

                    with st.expander(

                        f"{index}. {status}: "

                        f"{claim.get('claim', 'Claim')}"

                    ):

                        st.write(

                            claim.get(

                                "explanation",

                                "No explanation provided.",

                            )

                        )

                        for url in claim.get("source_urls", []):

                            st.markdown(f"- [{url}]({url})")

                        if status == "UNSUPPORTED":

                            st.warning(

                                "Review this claim and its evidence "

                                "before publishing."

                            )

            else:

                st.write(

                    "No material claims were flagged. "

                    "This does not guarantee factual accuracy."

                )

            # -------------------------------------------------

            # EXPORTS

            # -------------------------------------------------

            st.subheader("Export Content")

            st.download_button(

                "Download TXT",

                data=edited_draft,

                file_name="linkedin_post.txt",

                mime="text/plain",

            )

            st.download_button(

                "Download Markdown",

                data=f"# LinkedIn Post\n\n{edited_draft}",

                file_name="linkedin_post.md",

                mime="text/markdown",

            )

            st.download_button(

                "Download PDF",

                data=make_pdf(edited_draft),

                file_name="linkedin_post.pdf",

                mime="application/pdf",

            )

            # -------------------------------------------------

            # SAVE TO HISTORY

            # -------------------------------------------------



    # Persistent save control: this remains visible after Streamlit reruns.
    if st.session_state.get("last_generation_result"):
        if st.button("Save Post to History", key="save_post_to_history"):
            try:
                saved_result = st.session_state["last_generation_result"]
                saved_draft = st.session_state.get(
                    "editable_draft", saved_result.get("draft", "")
                )
                if not saved_draft.strip():
                    st.warning("The post is empty. Nothing was saved.")
                else:
                    saved_history = read_json(HISTORY_FILE, [])
                    if not isinstance(saved_history, list):
                        saved_history = []
                    record = {
                        "id": datetime.now().strftime("%Y%m%d%H%M%S%f"),
                        "created_at": datetime.now().isoformat(timespec="seconds"),
                        "request": st.session_state.get("last_generation_request", ""),
                        "tone": st.session_state.get("last_generation_tone", "Professional"),
                        "audience": st.session_state.get("last_generation_audience", "General LinkedIn audience"),
                        "draft": saved_draft,
                        "approved": saved_result.get("is_approved", False),
                        "attempts": saved_result.get("attempt", 0),
                        "scorecard": saved_result.get("scorecard", {}),
                        "claim_checks": saved_result.get("claim_checks", []),
                        "review_feedback": saved_result.get("review_feedback", ""),
                    }
                    saved_history.insert(0, record)
                    write_json(HISTORY_FILE, saved_history[:100])
                    st.success("Post saved successfully to Post History!")
            except Exception as error:
                st.error(f"Could not save post: {error}")

# =========================================================

# TAB 2: POST HISTORY

# =========================================================

with tab_history:

    st.subheader("Saved Posts")

    history = read_json(HISTORY_FILE, [])

    if not history:

        st.info(

            "No saved posts yet. Generate content and click "

            "'Save Post to History'."

        )

    else:

        for item in history:

            title = item.get("request", "Untitled")

            with st.expander(

                f"{item.get('created_at', '')} · {title[:80]}"

            ):

                st.write(f"Tone: {item.get('tone', '')}")

                st.write(f"Audience: {item.get('audience', '')}")

                st.write(

                    "Status: "

                    + (

                        "Approved"

                        if item.get("approved")

                        else "Needs review"

                    )

                )

                st.text_area(

                    "Saved content",

                    value=item.get("draft", ""),

                    height=180,

                    key=f"history\_{item.get('id')}",

                )

                st.download_button(

                    "Download this post",

                    data=item.get("draft", ""),

                    file_name=f"linkedin\_{item.get('id')}.txt",

                    mime="text/plain",

                    key=f"download\_{item.get('id')}",

                )

        st.download_button(

            "Export All History as JSON",

            data=json.dumps(

                history,

                ensure_ascii=False,

                indent=2,

            ),

            file_name="linkedin_post_history.json",

            mime="application/json",

        )

        if st.button("Clear All History"):

            write_json(HISTORY_FILE, [])

            st.rerun()

# =========================================================

# TAB 3: CAREER PROFILE

# =========================================================

with tab_profile:

    st.subheader("Saved Career Memory")

    saved_profile = read_json(PROFILE_FILE, {})

    if saved_profile:

        st.json(saved_profile)

        st.caption(

            "Stored locally in data/career_profile.json. "

            "Update it from the sidebar."

        )

    else:

        st.info(

            "Complete your career profile in the sidebar "

            "and click Save Career Memory."

        )

st.divider()

st.caption(

    "AI-generated content and verification results should be "

    "reviewed by a human before publication. This app does not "

    "publish posts directly to LinkedIn."

)
