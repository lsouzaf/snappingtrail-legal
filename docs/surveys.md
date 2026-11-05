---
id: surveys
title: Surveys
sidebar_position: 3
---

A survey is the questionnaire your respondents answer. Surveys live inside a **project**, and a project can hold several surveys about the same subject.

Only **administrators** create and edit surveys. Managers, coordinators and analysts can see them.

## Create a survey

1. Open **Projects** and choose a project.
2. Choose **New Survey**. Give it a **Survey Title** and, if you want, a **Description**, then choose **Create Survey**.
3. Add questions with **Text**, **Choice** or **Rating**, or bring ready-made ones with **From catalog**.

A new survey starts as a draft.

![The surveys of a project](./img/surveys-list-en.png)

![The survey builder](./img/surveys-builder-en.png)

## Question types

The builder creates three kinds of question:

- **Text**: a free answer.
- **Choice**: a list of options, with **Single answer** or **Multiple answers**. The **Yes/No** and **Likert** shortcuts fill in the options for you; Likert goes from "Strongly disagree" to "Strongly agree".
- **Rating**: a score on a scale. Pick a preset, **NPS** (0 to 10), **CSAT** (1 to 5) or **CES** (1 to 7), or **Custom** for your own scale.

![A choice question](./img/surveys-choice-en.png)

A question brought from the catalog keeps its type, which can be any of these:

| | |
|---|---|
| Short text | Long text |
| Number | Rating |
| Slider | NPS |
| Single choice | Multiple choice |
| Dropdown | Ranking |
| Likert | Date |
| Time | Date and time |
| Yes/No | Statement |

Tick **Required** when every completed interview must answer the question. The answer is checked when the interview is completed, and only for the questions the respondent was shown.

## Follow-up questions

In a choice question, each option can open a **follow-up question**, shown only to those who chose that option. For example, "Main reason for dissatisfaction" can appear only to those who answered "Dissatisfied"; everyone else never sees it.

Under the option, choose **Add follow-up question** and write it. The follow-up is answered with free text. Tick **Required when shown** if those who see it must answer it.

## The question catalog

The catalog holds ready-made questions, the same for every account. In the builder, **From catalog** opens the **Question Catalog**; the question you pick is copied into your survey, where you can change it like any other.

## Status

| Status | What it means |
|---|---|
| Draft | Being built. Nobody can answer it yet. |
| Active | Open for answers. A survey needs at least one question to become active. |
| Inactive | Closed for new interviews. Interviews already started can still be completed, and the answers are kept. |

**Pause collection** turns an active survey inactive, and **Resume collection** opens it again.

## Change a survey that is no longer a draft

Once a survey leaves the draft, its questions can no longer change: the builder shows them read-only. You can still change the title and the description.

To change the questions, choose **New version**. It creates a new draft with a copy of the questions, which you edit and then make active. The earlier survey keeps its answers.

## Delete a survey

Only a draft with no answers can be deleted, and it is deleted for good. A survey that has been active is not deleted: pause its collection instead.

## Next steps

- [Collect answers through a link or a QR code](../collection)
- [Collect in the field with the Collect app](../collect-app)
